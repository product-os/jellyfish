/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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

const _ = require('lodash')
const objectTemplate = require('object-template')

/**
 * @summary The wildcard schema
 * @type {Object}
 * @public
 */
const WILDCARD_SCHEMA = {
	type: 'object'
}

/**
 * @summary Get the filter schema of a card action
 * @function
 * @public
 *
 * @param {Object} card - card action
 * @returns {Object} JSON Schema
 *
 * @example
 * const schema = cardAction.getFilterSchema({ ... })
 */
exports.getFilterSchema = (card) => {
	return _.get(card, [ 'data', 'filter' ], WILDCARD_SCHEMA)
}

/**
 * @summary Get the arguments schema of a card action
 * @function
 * @public
 *
 * @param {Object} card - card action
 * @returns {Object} JSON Schema
 *
 * @example
 * const schema = cardAction.getArgumentsSchema({ ... })
 */
exports.getArgumentsSchema = (card) => {
	const argumentNames = _.keys(card.data.arguments)

	if (_.isEmpty(argumentNames)) {
		return WILDCARD_SCHEMA
	}

	return {
		type: 'object',
		properties: card.data.arguments,
		additionalProperties: false,
		required: argumentNames
	}
}

/**
 * @summary Get the compiled options object from an action card
 * @function
 * @public
 *
 * @param {Object} card - action card
 * @param {Object} args - action arguents
 * @returns {Object} compiled options
 *
 * @example
 * const options = cardAction.compileOptions({
 *   type: 'action',
 *   ...
 * }, { ... })
 */
exports.compileOptions = (card, args) => {
	return objectTemplate.compile(card.data.options, {
		arguments: args
	})
}

/**
 * @summary Get the super action of an action card
 * @function
 * @public
 * @param {Object} card - card action
 * @returns {(String|Null)} super action
 *
 * @example
 * const slug = cardAction.getSuperActionSlug({ ... })
 *
 * if (slug) {
 *   console.log(`The super action is called ${slug}`)
 * }
 */
exports.getSuperActionSlug = (card) => {
	return _.get(card, [ 'data', 'extends' ], null)
}
