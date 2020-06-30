/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const uuid = require('@balena/jellyfish-uuid')

/**
 * @summary Get the current timestamp
 * @function
 * @public
 *
 * @returns {String} RFC 3339 timestamp
 *
 * @example
 * const timestamp = utils.getCurrentTimestamp()
 */
exports.getCurrentTimestamp = () => {
	const currentDate = new Date()
	return currentDate.toISOString()
}

/**
 * @summary Get the arguments schema from an action card
 * @function
 * @public
 *
 * @param {Object} actionCard - action card
 * @returns {Object} arguments schema
 *
 * @example
 * const schema = utils.getActionArgumentsSchema({ ... })
 * console.log(schema.type)
 */
exports.getActionArgumentsSchema = (actionCard) => {
	const argumentNames = Object.keys(actionCard.data.arguments)
	return argumentNames.length === 0
		? {
			type: 'object'
		}
		: {
			type: 'object',
			properties: actionCard.data.arguments,
			additionalProperties: false,
			required: actionCard.data.required || argumentNames
		}
}

/**
 * @summary Check if a card exists in the system
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} object - card properties
 * @returns {Boolean} whether the card exists
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const hasCard = await utils.hasCard({ ... }, jellyfish, session, {
 *   id: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
 *   active: true,
 *   data: {
 *     foo: 'bar'
 *   }
 * })
 *
 * if (hasCard) {
 *   console.log('This card already exists')
 * }
 */
exports.hasCard = async (context, jellyfish, session, object) => {
	if (object.id && await jellyfish.getCardById(
		context, session, object.id)) {
		return true
	}

	if (object.slug && await jellyfish.getCardBySlug(
		context, session, `${object.slug}@${object.version}`)) {
		return true
	}

	return false
}

/**
 * @summary Get the slug for an event
 * @function
 * @public
 *
 * @param {String} type - event type
 * @returns {String} slug
 *
 * @example
 * const slug = await utils.getEventSlug('execute')
 */
exports.getEventSlug = async (type) => {
	const id = await uuid.random()
	return `${type}-${id}`
}
