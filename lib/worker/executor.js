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
const objectTemplate = require('object-template')
const jsonSchema = require('../json-schema')
const utils = require('./utils')
const errors = require('./errors')
const triggers = require('./triggers')
const jellyscript = require('../jellyscript')

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
 * @returns {(Object|Null)}
 *
 * @example
 * const card = await getInputCard(jellyfish, session, 'foo-bar')
 * if (card) {
 *   console.log(card)
 * }
 */
const getInputCard = async (jellyfish, session, identifier) => {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(identifier)) {
		return jellyfish.getCardBySlug(session, identifier)
	}

	const card = await jellyfish.getCardById(session, identifier)
	if (card) {
		return card
	}

	return jellyfish.getCardBySlug(session, identifier)
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
 * const result = await executor.insertCard(jellyfish, session, typeCard, {
 *   override: false,
 *   attachEvents: true,
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
exports.insertCard = async (jellyfish, session, typeCard, options, object) => {
	_.defaults(options, {
		triggers: []
	})

	if (!typeCard || !typeCard.data || !typeCard.data.schema) {
		throw new errors.WorkerNoElement(`Invalid type: ${typeCard}`)
	}

	// Fill-in any defaults as appropriate, for convenience
	const properties = _.omitBy({
		id: object.id,
		slug: object.slug,
		type: typeCard.slug,
		name: object.name,
		active: _.isNil(object.active) ? true : object.active,
		tags: object.tags || [],
		links: object.links || [],
		data: object.data || {}
	}, _.isNil)

	const hasCard = options.attachEvents && await utils.hasCard(jellyfish, session, object, {
		writeMode: true
	})

	const evaluationResult = jellyscript.evaluateObject(typeCard.data.schema, properties).object
	const insertedCard = await jellyfish.insertCard(session, evaluationResult, {
		override: options.override
	})

	if (options.attachEvents) {
		const eventName = options.override && hasCard ? 'update' : 'create'
		await options.executeAction(session, {
			action: 'action-create-event',
			card: insertedCard.id,
			arguments: {
				type: eventName,
				payload: _.omit(evaluationResult, [ 'type', 'id' ])
			}
		})
	}

	if (options.triggers) {
		let matchCard = insertedCard

		await Bluebird.map(options.triggers, async (trigger) => {
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

					trigger.filter.properties.data &&
					trigger.filter.properties.data.properties &&
					trigger.filter.properties.data.properties.target &&
					trigger.filter.properties.data.properties.target.type === 'object') {
				// Ensure we don't modify the original card
				matchCard = _.cloneDeep(insertedCard)
				matchCard.data.target = await jellyfish.getCardById(session, insertedCard.data.target)
			}

			const request = triggers.getRequest(trigger, insertedCard, matchCard)
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
				override: true
			})

			// Also from the locally cached triggers
			_.remove(options.triggers, (element) => {
				return _.isEqual(element, {
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
			await jellyfish.insertCard(session, trigger, {
				override: true
			})

			// Registered the newly created trigger
			// right away for performance reasons
			return options.setTriggers(options.triggers.concat([
				{
					action: trigger.data.action,
					card: trigger.data.target,
					filter: trigger.data.filter,
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
	const cards = await Bluebird.props({
		input: getInputCard(jellyfish, session, request.card),
		actor: jellyfish.getCardById(session, request.actor)
	})

	if (!cards.input) {
		throw new errors.WorkerNoElement(`No such input card: ${request.card}`)
	}

	if (!cards.actor) {
		throw new errors.WorkerNoElement(`No such actor: ${request.actor}`)
	}

	const actionInputCardFilter = _.get(request.action, [ 'data', 'filter' ], {
		type: 'object'
	})

	if (!jsonSchema.isValid(actionInputCardFilter, cards.input)) {
		throw new errors.WorkerSchemaMismatch('Input card does not match filter')
	}

	const argumentsSchema = utils.getActionArgumentsSchema(request.action)
	if (!jsonSchema.isValid(argumentsSchema, request.arguments)) {
		throw new errors.WorkerSchemaMismatch('Arguments do not match')
	}

	const actionName = request.action.slug
	const actionFunction = library[actionName]
	if (!actionFunction) {
		throw new errors.WorkerInvalidAction(`Unknown action function: ${actionName}`)
	}

	const compiledArguments = objectTemplate.compile(request.action.data.options, {
		arguments: request.arguments
	}, {
		delimiters: [ '\\[', '\\]' ]
	})

	return actionFunction(session, context, cards.input, {
		action: request.action,
		card: request.card,
		actor: request.actor,
		timestamp: request.timestamp,
		arguments: compiledArguments
	})
}
