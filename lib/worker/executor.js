/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const errio = require('errio')
const _ = require('lodash')
const skhema = require('skhema')
const fastEquals = require('fast-equals')
const utils = require('./utils')
const errors = require('./errors')
const triggers = require('./triggers')
const assert = require('@balena/jellyfish-assert')
const jellyscript = require('@balena/jellyfish-jellyscript')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)

/**
 * @summary The "type" card type
 * @type {String}
 * @private
 */
const CARD_TYPE_TYPE = 'type@1.0.0'

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
	if (identifier.includes('@')) {
		return jellyfish.getCardBySlug(context, session, identifier)
	}
	return jellyfish.getCardById(context, session, identifier)
}

const commit = async (context, jellyfish, session, typeCard, current, options, fn) => {
	assert.INTERNAL(context,
		typeCard && typeCard.data && typeCard.data.schema,
		errors.WorkerNoElement,
		`Invalid type: ${typeCard}`)

	const insertedCard = await fn()
	if (!insertedCard) {
		return null
	}

	if (current && fastEquals.deepEqual(
		_.omit(insertedCard, [ 'created_at', 'updated_at', 'linked_at', 'links' ]),
		_.omit(current, [ 'created_at', 'updated_at', 'linked_at', 'links' ])
	)) {
		logger.debug(context, 'Omitting pointless insertion', {
			slug: current.slug
		})

		return null
	}

	if (options.triggers) {
		const runTrigger = async (trigger) => {
			// Ignore triggered actions whose start date is in the future
			if (options.currentTime < triggers.getStartDate({
				data: trigger
			})) {
				return null
			}

			const request = await triggers.getRequest(jellyfish, trigger, insertedCard, {
				currentDate: new Date(),
				mode: current ? 'update' : 'insert',
				context,
				session
			})

			if (!request) {
				return null
			}

			const identifiers = _.uniq(_.castArray(request.card))

			// We need to execute triggered actions using a privileged session
			// as the triggered actions might involve things that the original
			// user may not have access to. i.e. triggered actions are system rules
			// might be system rules setup by an admin with privilege to insert
			// triggered actions.
			const triggerSession = options.context.privilegedSession

			const triggerCards = await Bluebird.map(identifiers, async (identifier) => {
				const triggerCard = await getInputCard(
					context, jellyfish, triggerSession, identifier)
				assert.INTERNAL(context, triggerCard, errors.WorkerNoElement,
					`No such input card for trigger ${trigger.slug}: ${identifier}`)
				return triggerCard
			})

			return Promise.all(triggerCards.map((triggerCard) => {
				return options.library[request.action.split('@')[0]].handler(
					triggerSession, options.context, triggerCard, {
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
			}))
		}

		const [ syncTriggers, asyncTriggers ] = _.partition(options.triggers, {
			async: false
		})

		// Run the synchronous, "blocking" triggers first
		await Bluebird.map(syncTriggers, runTrigger, {
			// Triggers can't be processed concurrently as they may modify cards, which
			// can cause race conditions if they are not done in serial
			concurrency: 1
		})

		// Don't await aync triggers
		Bluebird.map(asyncTriggers, (trigger) => {
			return runTrigger(trigger)
				.catch((error) => {
					const errorObject = errio.toObject(error, {
						stack: true
					})

					const logData = {
						error: errorObject,
						input: insertedCard.slug,
						trigger: trigger.slug
					}

					if (error.expected) {
						logger.warn(context, 'Execute error in asynchronous trigger', logData)
					} else {
						logger.error(context, 'Execute error', logData)
					}
				})
		}, {
			concurrency: 1
		})
	}

	if (options.attachEvents) {
		const time = options.timestamp
			? new Date(options.timestamp)
			: options.currentTime

		const request = {
			action: 'action-create-event@1.0.0',
			card: insertedCard,
			actor: options.actor,
			context,
			timestamp: time.toISOString(),
			epoch: time.valueOf(),
			arguments: {
				name: options.reason,
				type: options.eventType,
				payload: options.eventPayload,
				tags: []
			}
		}

		// We use a privileged session here as we want the worker
		// to be able to create update/create events but not necessarily
		// the user.
		await options.library[request.action.split('@')[0]].handler(
			options.context.privilegedSession,
			options.context,
			insertedCard,
			request)
	}

	// If the card markers have changed then update the timeline of the card
	if (current && !fastEquals.deepEqual(current.markers, insertedCard.markers)) {
		const timeline = await jellyfish.query(context, session, {
			$$links: {
				'is attached to': {
					type: 'object',
					required: [ 'slug', 'type' ],
					properties: {
						slug: {
							type: 'string',
							const: insertedCard.slug
						},
						type: {
							type: 'string',
							const: insertedCard.type
						}
					}
				}
			},
			type: 'object',
			required: [ 'slug', 'version', 'type' ],
			properties: {
				slug: {
					type: 'string'
				},
				version: {
					type: 'string'
				},
				type: {
					type: 'string'
				}
			}
		})

		for (const event of timeline) {
			if (!fastEquals.deepEqual(event.markers, insertedCard.markers)) {
				await jellyfish.patchCardBySlug(
					context, session, `${event.slug}@${event.version}`, [
						{
							op: 'replace',
							path: '/markers',
							value: insertedCard.markers
						}
					], {
						type: event.type
					})
			}
		}
	}

	if (insertedCard.type === CARD_TYPE_TYPE) {
		// Remove any previously attached trigger for this type
		const typeTriggers = await triggers.getTypeTriggers(
			context, jellyfish, session, `${insertedCard.slug}@${insertedCard.version}`)
		await Bluebird.map(typeTriggers, async (trigger) => {
			await jellyfish.patchCardBySlug(
				context, session, `${trigger.slug}@${trigger.version}`, [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				], {
					type: trigger.type
				})

			// Also from the locally cached triggers
			_.remove(options.triggers, {
				id: trigger.id
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
				slug: insertedTrigger.slug,
				action: trigger.data.action,
				target: trigger.data.target,
				filter: trigger.data.filter,
				arguments: trigger.data.arguments
			}

			if (trigger.data.mode) {
				triggerObject.mode = trigger.data.mode
			}

			// Triggered actions default to being asynchronous
			if (_.has(trigger.data, [ 'async' ])) {
				triggerObject.async = trigger.data.async
			} else {
				triggerObject.async = true
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
 * @summary Insert a card in the system
 * @function
 * @public
 *
 * @param {Object} context - worker execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} typeCard - type card
 * @param {Object} options - options
 * @param {Boolean} options.replace - perform a replace
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
	options.triggers = options.triggers || []

	logger.debug(context, 'Inserting card', {
		slug: object.slug,
		type: typeCard.slug,
		attachEvents: options.attachEvents,
		triggers: options.triggers.length
	})

	object.type = `${typeCard.slug}@${typeCard.version}`

	let card = null
	if (object.slug) {
		card = await jellyfish.getCardBySlug(
			context, session, `${object.slug}@${object.version || 'latest'}`)
	}
	if (!card && object.id) {
		card = await jellyfish.getCardById(
			context, session, object.id)
	}

	if (typeof object.name !== 'string') {
		Reflect.deleteProperty(object, 'name')
	}

	options.eventPayload = _.omit(object, [ 'id' ])
	options.eventType = 'create'

	return commit(context, jellyfish, session, typeCard, card, options, async () => {
		const result = jellyscript.evaluateObject(typeCard.data.schema, object)
		return jellyfish.insertCard(context, session, result)
	})
}

exports.replaceCard = async (context, jellyfish, session, typeCard, options, object) => {
	options.triggers = options.triggers || []

	logger.debug(context, 'Replacing card', {
		slug: object.slug,
		type: typeCard.slug,
		attachEvents: options.attachEvents,
		triggers: options.triggers.length
	})

	object.type = `${typeCard.slug}@${typeCard.version}`

	let card = null
	if (object.slug) {
		card = await jellyfish.getCardBySlug(
			context, session, `${object.slug}@${object.version}`)
	}
	if (!card && object.id) {
		card = await jellyfish.getCardById(
			context, session, object.id)
	}

	if (typeof object.name !== 'string') {
		Reflect.deleteProperty(object, 'name')
	}

	if (card) {
		options.attachEvents = false
	} else {
		options.eventPayload = _.omit(object, [ 'id' ])
		options.eventType = 'create'
	}

	return commit(context, jellyfish, session, typeCard, card, options, async () => {
		const result = jellyscript.evaluateObject(typeCard.data.schema, object)
		return jellyfish.replaceCard(context, session, result)
	})
}

exports.patchCard = async (context, jellyfish, session, typeCard, options, object, patch) => {
	assert.INTERNAL(context,
		object.version,
		errors.WorkerInvalidVersion,
		`Can't update without a version for: ${object.slug}`)

	options.triggers = options.triggers || []

	logger.debug(context, 'Patching card', {
		slug: object.slug,
		version: object.version,
		type: typeCard.slug,
		attachEvents: options.attachEvents,
		operations: patch.length,
		triggers: options.triggers.length
	})

	options.eventPayload = patch
	options.eventType = 'update'

	return commit(context, jellyfish, session, typeCard, object, options, async () => {
		const newPatch = jellyscript.evaluatePatch(typeCard.data.schema, object, patch)
		return jellyfish.patchCardBySlug(
			context, session, `${object.slug}@${object.version}`, newPatch, {
				type: typeCard.slug
			})
	})
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
		actor: jellyfish.getCardById(request.context, session, request.actor)
	})

	assert.USER(request.context, cards.input, errors.WorkerNoElement,
		`No such input card: ${request.card}`)
	assert.INTERNAL(request.context, cards.actor, errors.WorkerNoElement,
		`No such actor: ${request.actor}`)

	const actionInputCardFilter = _.get(request.action, [ 'data', 'filter' ], {
		type: 'object'
	})

	assert.INTERNAL(request.context,
		skhema.isValid(actionInputCardFilter, cards.input),
		errors.WorkerSchemaMismatch, 'Input card does not match filter')

	// TODO: Action definition bodies are not versioned yet
	// as they are not part of the action cards.
	const actionName = request.action.slug.split('@')[0]

	const argumentsSchema = utils.getActionArgumentsSchema(request.action)

	assert.USER(request.context,
		skhema.isValid(argumentsSchema, request.arguments),
		errors.WorkerSchemaMismatch,
		() => {
			return `Arguments do not match for action ${actionName}: ${(JSON.stringify(request.arguments, null, 2))}`
		})

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
