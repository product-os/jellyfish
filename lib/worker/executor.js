/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const skhema = require('skhema')
const utils = require('./utils')
const errors = require('./errors')
const triggers = require('./triggers')
const jellyscript = require('../jellyscript')
const assert = require('../assert')
const logger = require('../logger').getLogger(__filename)

/**
 * @summary The "type" card type
 * @type {String}
 * @private
 */
const CARD_TYPE_TYPE = 'type'

/**
 * @summary Default insert concurrency
 * @type {Number}
 * @private
 */
const INSERT_CONCURRENCY = 3

/**
 * @summary Get the request input card
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} identifier - id or slug
 * @returns {(Object|Null)}
 *
 * @example
 * const card = await getInputCard({ ... }, jellyfish, session, 'foo-bar')
 * if (card) {
 *   console.log(card)
 * }
 */
const getInputCard = async (context, jellyfish, session, identifier) => {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(identifier)) {
		return jellyfish.getCardBySlug(context, session, identifier)
	}

	const card = await jellyfish.getCardById(context, session, identifier)
	if (card) {
		return card
	}

	return jellyfish.getCardBySlug(context, session, identifier)
}

/**
 * @summary Insert a card in the system
 * @function
 * @public
 *
 * @param {Object} context - worker execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} typeCard - type card
 * @param {Object} options - options
 * @param {Boolean} options.override - perform an upsert
 * @param {Date} options.currentTime - current time
 * @param {Date} [options.timestamp] - Upsert timestamp
 * @param {Boolean} options.attachEvents - attach create/update events
 * @param {Function} options.executeAction - execute action function (session, request)
 * @param {Object[]} [options.triggers] - known triggered action
 * @param {Object} object - card properties
 * @returns {Object} inserted card
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const typeCard = await jellyfish.getCardBySlug(session, 'card')
 *
 * const result = await executor.insertCard({ ... }, jellyfish, session, typeCard, {
 *   attachEvents: true,
 *   currentTime: new Date(),
 *   triggers: [ ... ],
 *   executeAction: async (session, request) => {
 *     ...
 *   }
 * }, {
 *   slug: 'foo',
 *   data: {
 *     bar: 'baz'
 *   }
 * })
 *
 * console.log(result.id)
 */
exports.insertCard = async (context, jellyfish, session, typeCard, options, object) => {
	_.defaults(options, {
		triggers: []
	})

	assert.INTERNAL(context,
		typeCard && typeCard.data && typeCard.data.schema,
		errors.WorkerNoElement,
		`Invalid type: ${typeCard}`)

	logger.debug(context, 'Inserting card', {
		slug: object.slug,
		type: typeCard.slug,
		attachEvents: options.attachEvents,
		triggers: options.triggers.length,
		override: options.override
	})

	object.type = typeCard.slug
	const getOptions = {
		writeMode: true,
		type: object.type
	}

	let card = null
	if (object.slug) {
		card = await jellyfish.getCardBySlug(context, session, object.slug, getOptions)
	}
	if (!card && object.id) {
		card = await jellyfish.getCardById(context, session, object.id, getOptions)
	}

	const hasCard = options.attachEvents && card
	const evaluationResult = jellyscript.evaluateObject(typeCard.data.schema, object)

	if (typeof evaluationResult.name !== 'string') {
		Reflect.deleteProperty(evaluationResult, 'name')
	}

	const insertedCard = options.override
		? await jellyfish.patchCard(context, session, evaluationResult)
		: await jellyfish.insertCard(context, session, evaluationResult)

	if (!insertedCard) {
		return null
	}

	if (_.isEqual(
		_.omit(insertedCard, [ 'created_at', 'updated_at', 'linked_at', 'links' ]),
		_.omit(card, [ 'created_at', 'updated_at', 'linked_at', 'links' ])
	)) {
		logger.debug(context, 'Omitting pointless insertion', {
			slug: object.slug
		})

		return null
	}

	if (options.attachEvents) {
		const eventName = options.override && hasCard ? 'update' : 'create'
		const time = options.timestamp
			? new Date(options.timestamp)
			: options.currentTime

		const request = {
			action: 'action-create-event',
			card: insertedCard,
			actor: options.actor,
			context,
			timestamp: time.toISOString(),
			epoch: time.valueOf(),
			arguments: {
				name: options.reason,
				type: eventName,
				tags: [],
				payload: _.omit(evaluationResult, [ 'id' ])
			}
		}

		// We use a privileged session here as we want the worker
		// to be able to create update/create events but not necessarily
		// the user.
		await options.library[request.action].handler(
			options.context.privilegedSession,
			options.context,
			insertedCard,
			request)
	}

	// If the card markers have changed then update the timeline of the card
	if (
		hasCard &&
		options.override &&
		!_.isEqual(card.markers, insertedCard.markers)
	) {
		const timeline = await jellyfish.query(context, session, {
			$$links: {
				'is attached to': {
					type: 'object',
					required: [ 'id', 'type' ],
					properties: {
						id: {
							type: 'string',
							const: insertedCard.id
						},
						type: {
							type: 'string',
							const: insertedCard.type
						}
					}
				}
			},
			type: 'object',
			additionalProperties: true
		})

		for (const event of timeline) {
			if (!_.isEqual(event.markers, insertedCard.markers)) {
				event.markers = insertedCard.markers
				await jellyfish.patchCard(context, session, event)
			}
		}
	}

	if (options.triggers) {
		await Bluebird.map(options.triggers, async (trigger) => {
			// Ignore triggered actions whose start date is in the future
			if (options.currentTime < triggers.getStartDate({
				data: trigger
			})) {
				return null
			}

			const request = await triggers.getRequest(jellyfish, trigger, insertedCard, {
				currentDate: new Date(),
				mode: hasCard ? 'update' : 'insert',
				context,
				session
			})

			if (!request) {
				return null
			}

			const triggerCard = await getInputCard(
				context, jellyfish, session, request.card)
			assert.INTERNAL(context, triggerCard, errors.WorkerNoElement,
				`No such input card for trigger: ${request.card}`)

			return options.library[request.action].handler(
				session, options.context, triggerCard, {
					card: triggerCard,
					action: request.action,
					actor: options.actor,
					context: request.context,
					timestamp: request.currentDate.toISOString(),
					epoch: request.currentDate.valueOf(),
					arguments: request.arguments,

					// Carry the old originator if present so we
					// don't break the chain
					originator: options.originator || request.originator
				})
		}, {
			concurrency: INSERT_CONCURRENCY
		})
	}

	if (insertedCard.type === CARD_TYPE_TYPE) {
		// Remove any previously attached trigger for this type
		const typeTriggers = await triggers.getTypeTriggers(
			context, jellyfish, session, insertedCard.slug)
		await Bluebird.map(typeTriggers, async (trigger) => {
			trigger.active = false
			await jellyfish.patchCard(context, session, trigger)

			// Also from the locally cached triggers
			_.remove(options.triggers, (element) => {
				return _.isEqual(element, {
					id: trigger.id,
					action: trigger.data.action,
					card: trigger.data.target,
					filter: trigger.data.filter,
					arguments: trigger.data.arguments
				})
			})
		}, {
			concurrency: INSERT_CONCURRENCY
		})

		await Bluebird.map(jellyscript.getTypeTriggers(insertedCard), async (trigger) => {
			// We don't want to use the actions queue here
			// so that watchers are applied right away
			const insertedTrigger = await jellyfish.replaceCard(
				context, session, trigger)

			const triggerObject = {
				id: insertedTrigger.id,
				action: trigger.data.action,
				card: trigger.data.target,
				filter: trigger.data.filter,
				arguments: trigger.data.arguments
			}

			if (trigger.data.mode) {
				triggerObject.mode = trigger.data.mode
			}

			// Registered the newly created trigger
			// right away for performance reasons
			return options.setTriggers(context, options.triggers.concat([
				triggerObject
			]))
		}, {
			concurrency: INSERT_CONCURRENCY
		})
	}

	return insertedCard
}

/**
 * @summary Execute an action request
 * @function
 * @protected
 *
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} context - execution context
 * @param {Object} library - actions library
 * @param {Object} request - request
 * @param {String} request.actor - actor id
 * @param {Object} request.action - action card
 * @param {String} request.timestamp - action timestamp
 * @param {String} request.card - action input card id or slug
 * @param {Object} request.arguments - action arguments
 * @returns {Any} action result
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const result = await executor.run(jellyfish, session, { ... }, { ... }, { ... })
 * console.log(result)
 */
exports.run = async (jellyfish, session, context, library, request) => {
	const cards = await Bluebird.props({
		input: getInputCard(request.context, jellyfish, session, request.card),
		actor: jellyfish.getCardById(request.context, session, request.actor, {
			type: 'user'
		})
	})

	assert.INTERNAL(request.context, cards.input, errors.WorkerNoElement,
		`No such input card: ${request.card}`)
	assert.INTERNAL(request.context, cards.actor, errors.WorkerNoElement,
		`No such actor: ${request.actor}`)

	const actionInputCardFilter = _.get(request.action, [ 'data', 'filter' ], {
		type: 'object'
	})

	assert.INTERNAL(request.context,
		skhema.isValid(actionInputCardFilter, cards.input),
		errors.WorkerSchemaMismatch, 'Input card does not match filter')

	const actionName = request.action.slug
	const argumentsSchema = utils.getActionArgumentsSchema(request.action)

	const args = JSON.stringify(request.arguments, null, 2)
	assert.USER(request.context,
		skhema.isValid(argumentsSchema, request.arguments),
		errors.WorkerSchemaMismatch,
		`Arguments do not match for action ${actionName}: ${args}`)

	const actionFunction = library[actionName] && library[actionName].handler
	assert.INTERNAL(request.context,
		actionFunction,
		errors.WorkerInvalidAction, `Unknown action function: ${actionName}`)

	return actionFunction(session, context, cards.input, {
		action: request.action,
		card: request.card,
		actor: request.actor,
		context: request.context,
		timestamp: request.timestamp,
		epoch: request.epoch,
		arguments: request.arguments
	})
}
