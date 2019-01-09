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

const uuid = require('uuid/v4')

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
 * @param {Object} [options] - options
 * @param {Boolean} [options.writeMode] - write mode
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
exports.hasCard = async (context, jellyfish, session, object, options = {}) => {
	if (object.id && await jellyfish.getCardById(context, session, object.id, options)) {
		return true
	}

	if (object.slug && await jellyfish.getCardBySlug(context, session, object.slug, options)) {
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
 * const slug = utils.getEventSlug('execute')
 */
exports.getEventSlug = (type) => {
	return `${type}-${uuid()}`
}
