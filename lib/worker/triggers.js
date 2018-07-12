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

const jsone = require('json-e')
const jsonSchema = require('../json-schema')

/**
 * @summary Check if a trigger matches a card
 * @function
 * @private
 *
 * @param {Object} trigger - trigger
 * @param {Object} trigger.filter - filter
 * @param {Object} card - card
 * @returns {Boolean} whether the trigger matches the card
 *
 * @example
 * if (matchesCard({
 *   filter: { ... }
 * }, { ... })) {
 *   console.log('The trigger matches')
 * }
 */
const matchesCard = (trigger, card) => {
	// A small performance shortcut, given that most triggered
	// actions do filtering based on the card type
	if (trigger.filter.properties.type &&
			trigger.filter.properties.type.const &&
			trigger.filter.properties.type.const !== card.type) {
		return false
	}

	return jsonSchema.isValid(trigger.filter, card)
}

/**
 * @summary Compile the trigger data
 * @function
 * @private
 *
 * @param {Object} trigger - trigger
 * @param {String} trigger.card - card id
 * @param {Object} trigger.arguments - arguments
 * @param {Object} card - card
 * @returns {Object} compiled data
 *
 * @example
 * const data = compileTrigger({ ... }, { ... })
 * if (data) {
 *   console.log(data.card)
 *   console.log(data.arguments)
 * }
 */
const compileTrigger = (trigger, card) => {
	try {
		return jsone(trigger, {
			source: card
		})
	} catch (error) {
		if (error.name === 'InterpreterError') {
			return null
		}

		throw error
	}
}

/**
 * @summary Get a request from a trigger
 * @function
 * @public
 *
 * @param {Object} trigger - trigger
 * @param {Object} trigger.filter - filter
 * @param {String} trigger.action - action slug
 * @param {String} trigger.card - card id
 * @param {Object} trigger.arguments - arguments
 * @param {Object} card - card
 * @param {Object} matchCard - card to use when matching the filter (usually the same as card)
 * @returns {(Object|Null)} request, or null if error
 *
 * @example
 * const request = triggers.getRequest({ ... }, { ... }, { ... })
 * if (request) {
 *   console.log(request.action)
 *   console.log(request.arguments)
 *   console.log(request.card)
 * }
 */
exports.getRequest = (trigger, card, matchCard) => {
	if (!matchesCard(trigger, matchCard)) {
		return null
	}

	// We are not interested in compiling the rest of
	// the properties, and skipping them here means that
	// the templating engine will be a bit faster
	const compiledTrigger = compileTrigger({
		arguments: trigger.arguments,
		card: trigger.card
	}, card)

	if (!compiledTrigger) {
		return null
	}

	return {
		action: trigger.action,
		arguments: compiledTrigger.arguments,
		card: compiledTrigger.card
	}
}

/**
 * @summary Get all triggered actions associated with a type
 * @function
 * @public
 *
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} type - type slug
 * @returns {Object[]} triggered actions
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const cards = await triggers.getTypeTriggers({ ... }, session, 'user')
 *
 * for (const card of cards) {
 *   console.log(card)
 * }
 */
exports.getTypeTriggers = async (jellyfish, session, type) => {
	return jellyfish.query(session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'id', 'active', 'type', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: type
					}
				}
			}
		}
	})
}
