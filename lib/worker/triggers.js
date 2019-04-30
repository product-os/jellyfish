/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const jsone = require('json-e')
const skhema = require('skhema')
const moment = require('moment')
const errors = require('./errors')

/**
 * @summary Check if a trigger matches a card
 * @function
 * @private
 *
 * @param {Object} trigger - trigger
 * @param {Object} trigger.filter - filter
 * @param {(Object|Null)} card - card
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
	if (!card) {
		return true
	}

	// A small performance shortcut, given that most triggered
	// actions do filtering based on the card type
	if (trigger.filter &&
			trigger.filter.properties &&
			trigger.filter.properties.type &&
			trigger.filter.properties.type.const &&
			trigger.filter.properties.type.const !== card.type) {
		return false
	}

	return skhema.isValid(trigger.filter, card)
}

/**
 * @summary Compile the trigger data
 * @function
 * @private
 *
 * @param {Object} trigger - trigger
 * @param {String} trigger.card - card id
 * @param {Object} trigger.arguments - arguments
 * @param {(Object|Null)} card - card
 * @param {Date} currentDate - current date
 * @returns {Object} compiled data
 *
 * @example
 * const data = compileTrigger({ ... }, { ... }, new Date())
 * if (data) {
 *   console.log(data.card)
 *   console.log(data.arguments)
 * }
 */
const compileTrigger = (trigger, card, currentDate) => {
	try {
		const context = {
			timestamp: currentDate.toISOString(),
			epoch: currentDate.valueOf(),
			matchRE: (pattern, flags, string) => {
				const regEx = flags ? new RegExp(pattern, flags) : new RegExp(pattern)
				const match = string.match(regEx)
				return match || []
			}
		}

		if (card) {
			context.source = card
		}

		return jsone(trigger, context)
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
 * @param {Object} options - options
 * @param {Object} options.matchCard - card to use when matching the filter (usually the same as card)
 * @param {Date} options.currentDate - current date
 * @param {Object} options.context - execution context
 * @returns {(Object|Null)} request, or null if error
 *
 * @example
 * const request = triggers.getRequest({ ... }, { ... }, {
 *   currentDate: new Date(),
 *   matchCard: { ... }
 * })
 * if (request) {
 *   console.log(request.action)
 *   console.log(request.arguments)
 *   console.log(request.originator)
 *   console.log(request.card)
 * }
 */
exports.getRequest = (trigger, card, options = {}) => {
	if (!matchesCard(trigger, options.matchCard)) {
		return null
	}

	// We are not interested in compiling the rest of
	// the properties, and skipping them here means that
	// the templating engine will be a bit faster
	const compiledTrigger = compileTrigger({
		arguments: trigger.arguments,
		type: trigger.type,
		card: trigger.card
	}, card, options.currentDate)

	if (!compiledTrigger) {
		return null
	}

	return {
		action: trigger.action,
		arguments: compiledTrigger.arguments,
		originator: trigger.id,
		context: options.context,
		currentDate: options.currentDate,
		type: compiledTrigger.type,
		card: compiledTrigger.card
	}
}

/**
 * @summary Get all triggered actions associated with a type
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} type - type slug
 * @returns {Object[]} triggered actions
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const cards = await triggers.getTypeTriggers({ ... }, { ... }, session, 'user')
 *
 * for (const card of cards) {
 *   console.log(card)
 * }
 */
exports.getTypeTriggers = async (context, jellyfish, session, type) => {
	return jellyfish.query(context, session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'id', 'version', 'active', 'type', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			version: {
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

				// We only want to consider cards that act based on a filter
				required: [ 'type', 'filter' ],

				properties: {
					type: {
						type: 'string',
						const: type
					},
					filter: {
						type: 'object',
						additionalProperties: true
					}
				}
			}
		}
	})
}

/**
 * @summary Get the start date of a triggered action
 * @function
 * @public
 *
 * @description
 * The start date determines when the triggered action should
 * start taking effect.
 * This function defaults to epoch if there is no start date.
 *
 * @param {Object} trigger - triggered action card
 * @returns {Date} start date
 *
 * @example
 * const date = triggers.getStartDate({
 *   type: 'triggered-action',
 *   data: { ... }
 * })
 *
 * console.log(date.toISOString())
 */
exports.getStartDate = (trigger) => {
	if (trigger && trigger.data && trigger.data.startDate) {
		const date = new Date(trigger.data.startDate)

		// Detect if the parsed date object is valid
		if (!isNaN(date.getTime())) {
			return date
		}
	}

	// The oldest possible date
	return new Date('1970-01-01Z00:00:00:000')
}

/**
 * @summary Get the next execution date for a trigger
 * @function
 * @public
 *
 * @param {Object} trigger - triggered action card
 * @param {Date} lastExecutionDate - last execution date
 * @returns {(Date|Null)} next execution date, if any
 *
 * @example
 * const nextExecutionDate = triggers.getNextExecutionDate({ ... }, new Date())
 * if (nextExecutionDate) {
 *   console.log(nextExecutionDate.toISOString())
 * }
 */
exports.getNextExecutionDate = (trigger, lastExecutionDate) => {
	if (!trigger || !trigger.data || !trigger.data.interval) {
		return null
	}

	const startDate = exports.getStartDate(trigger)
	if (!lastExecutionDate ||
			!_.isDate(lastExecutionDate) ||
			isNaN(lastExecutionDate.getTime())) {
		return startDate
	}

	// The interval should be an ISO 8601 duration string, like PT1H
	const duration = moment.duration(trigger.data.interval).asMilliseconds()
	if (duration === 0) {
		throw new errors.WorkerInvalidDuration(`Invalid interval: ${trigger.data.interval}`)
	}

	const intervals = Math.floor(Math.abs(lastExecutionDate - startDate) / duration)
	const times = lastExecutionDate >= startDate || intervals === 0 ? intervals + 1 : 0
	return new Date(startDate.getTime() + (duration * times))
}
