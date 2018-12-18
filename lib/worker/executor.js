/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const skhema = require('skhema')
const utils = require('./utils')
const errors = require('./errors')
const triggers = require('./triggers')
const jellyscript = require('../jellyscript')
const logger = require('../logger').getLogger('jellyfish:worker:executor')

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
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} identifier - id or slug
 * @param {Object} options - options
 * @param {String} options.type - input card type
 * @param {Object} options.ctx - execution context
 * @returns {(Object|Null)}
 *
 * @example
 * const card = await getInputCard(jellyfish, session, 'foo-bar', {
 *   type: 'card'
 * })
 *
 * if (card) {
 *   console.log(card)
 * }
 */
const getInputCard = async (jellyfish, session, identifier, options) => {
	if (!options.type) {
		throw new errors.WorkerInvalidActionRequest('Missing request input card type')
	}

	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(identifier)) {
		return jellyfish.getCardBySlug(session, identifier, {
			type: options.type,
			ctx: options.ctx
		})
	}

	const card = await jellyfish.getCardById(session, identifier, {
		type: options.type,
		ctx: options.ctx
	})

	if (card) {
		return card
	}

	return jellyfish.getCardBySlug(session, identifier, {
		type: options.type,
		ctx: options.ctx
	})
}

/**
 * @summary Insert a card in the system
 * @function
 * @public
 *
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} typeCard - type card
 * @param {Object} options - options
 * @param {Boolean} options.override - perform an upsert
 * @param {Date} options.currentTime - current time
 * @param {Boolean} options.attachEvents - attach create/update events
 * @param {Function} options.executeAction - execute action function (session, request)
 * @param {Object[]} [options.triggers] - known triggered action
 * @param {Object} object - card properties
 * @param {Object} executionContext - worker execution context
 * @returns {Object} inserted card
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const typeCard = await jellyfish.getCardBySlug(session, 'card')
 *
 * const result = await executor.insertCard(jellyfish, session, typeCard, {
 *   override: false,
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
exports.insertCard = async (jellyfish, session, typeCard, options, object, executionContext) => {
	logger.debug(executionContext, `Inserting card: ${object.slug}`)
	_.defaults(options, {
		triggers: []
	})

	if (!typeCard || !typeCard.data || !typeCard.data.schema) {
		throw new errors.WorkerNoElement(`Invalid type: ${typeCard}`, executionContext)
	}

	object.type = typeCard.slug
	const getOptions = {
		writeMode: true,
		type: object.type,
		ctx: executionContext
	}

	let card = null
	if (object.slug) {
		card = await jellyfish.getCardBySlug(session, object.slug, getOptions)
	}
	if (!card && object.id) {
		card = await jellyfish.getCardById(session, object.id, getOptions)
	}

	const hasCard = options.attachEvents && card
	const evaluationResult = jellyscript.evaluateObject(typeCard.data.schema, object)

	const insertedCard = await jellyfish.insertCard(session, evaluationResult, {
		override: options.override,
		ctx: executionContext
	})

	if (_.isEqual(insertedCard, card)) {
		return null
	}

	if (options.attachEvents) {
		const eventName = options.override && hasCard ? 'update' : 'create'
		await options.executeAction(session, {
			action: 'action-create-event',
			card: insertedCard.id,
			type: insertedCard.type,
			arguments: {
				type: eventName,
				tags: [],
				payload: _.omit(evaluationResult, [ 'id' ])
			}
		})
	}

	if (options.triggers) {
		await Bluebird.map(options.triggers, async (trigger) => {
			let matchCard = insertedCard

			// Ignore triggered actions whose start date is in the future
			if (options.currentTime < triggers.getStartDate({
				data: trigger
			})) {
				return null
			}

			// This is a terrible hack to expand the target property
			// of a card if there is a triggered action filter that
			// attempts to match its content. This is useful since in
			// the case of AGGREGATE, we want to filter for events
			// attached to a particular type of card, but the target is
			// just an ID, and therefore type checks are not possible.
			if (insertedCard.data.target &&

					// Ensure we only perform the expansion once, even if there
					// is more than one triggered action interested on the target
					!_.get(matchCard, [ 'data', 'target', 'id' ]) &&

					trigger.filter &&
					trigger.filter.properties &&
					trigger.filter.properties.data &&
					trigger.filter.properties.data.properties &&
					trigger.filter.properties.data.properties.target &&
					trigger.filter.properties.data.properties.target.type === 'object') {
				// Ensure we don't modify the original card
				matchCard = _.cloneDeep(insertedCard)

				// This condition is usually true for create and update events. This
				// is a performance optimisation to infer the type of the target
				// this event is attached to based on the structure of these events.
				// This special case should be unnecessary once we replace this whole
				// logic with links.
				const targetType = insertedCard.type === 'create' || insertedCard.type === 'update'
					? insertedCard.data.payload.type
					: trigger.filter.properties.data.properties.target.properties.type.const

				matchCard.data.target = await jellyfish.getCardById(session, insertedCard.data.target, {
					type: targetType,
					ctx: executionContext
				})
			}

			const request = triggers.getRequest(trigger, insertedCard, {
				currentDate: new Date(),
				matchCard
			})

			if (!request) {
				return null
			}

			return options.executeAction(session, request)
		}, {
			concurrency: INSERT_CONCURRENCY
		})
	}

	if (insertedCard.type === CARD_TYPE_TYPE) {
		// Remove any previously attached trigger for this type
		const typeTriggers = await triggers.getTypeTriggers(jellyfish, session, insertedCard.slug)
		await Bluebird.map(typeTriggers, async (trigger) => {
			trigger.active = false
			await jellyfish.insertCard(session, trigger, {
				override: true,
				ctx: executionContext
			})

			// Also from the locally cached triggers
			_.remove(options.triggers, (element) => {
				return _.isEqual(element, {
					id: trigger.id,
					action: trigger.data.action,
					card: trigger.data.target,
					filter: trigger.data.filter,
					type: trigger.data.targetType,
					arguments: trigger.data.arguments
				})
			})
		}, {
			concurrency: INSERT_CONCURRENCY
		})

		await Bluebird.map(jellyscript.getTypeTriggers(insertedCard), async (trigger) => {
			// We don't want to use the actions queue here
			// so that watchers are applied right away
			const insertedTrigger = await jellyfish.insertCard(session, trigger, {
				override: true,
				ctx: executionContext
			})

			// Registered the newly created trigger
			// right away for performance reasons
			return options.setTriggers(options.triggers.concat([
				{
					id: insertedTrigger.id,
					action: trigger.data.action,
					card: trigger.data.target,
					filter: trigger.data.filter,
					type: trigger.data.targetType,
					arguments: trigger.data.arguments
				}
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
	const execCtx = request.ctx
	const cards = await Bluebird.props({
		input: getInputCard(jellyfish, session, request.card, {
			type: request.type,
			ctx: execCtx
		}),
		actor: jellyfish.getCardById(session, request.actor, {
			type: 'user',
			ctx: execCtx
		})
	})

	if (!cards.input) {
		throw new errors.WorkerNoElement(`No such input card: ${request.card}`, execCtx)
	}

	if (!cards.actor) {
		throw new errors.WorkerNoElement(`No such actor: ${request.actor}`, execCtx)
	}

	const actionInputCardFilter = _.get(request.action, [ 'data', 'filter' ], {
		type: 'object'
	})

	if (!skhema.isValid(actionInputCardFilter, cards.input)) {
		throw new errors.WorkerSchemaMismatch('Input card does not match filter', execCtx)
	}

	const argumentsSchema = utils.getActionArgumentsSchema(request.action)
	if (!skhema.isValid(argumentsSchema, request.arguments)) {
		throw new errors.WorkerSchemaMismatch('Arguments do not match', execCtx)
	}

	const actionName = request.action.slug
	const actionFunction = library[actionName]
	if (!actionFunction) {
		throw new errors.WorkerInvalidAction(`Unknown action function: ${actionName}`, execCtx)
	}

	return actionFunction(session, context, cards.input, {
		action: request.action,
		card: request.card,
		actor: request.actor,
		timestamp: request.timestamp,
		epoch: request.epoch,
		arguments: request.arguments
	})
}
