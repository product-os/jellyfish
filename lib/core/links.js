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

const errors = require('./errors')
const jsonSchema = require('./json-schema')

/**
 * @summary Evaluate a card link
 * @function
 * @private
 *
 * @description
 * This function is exported for testability purposes.
 *
 * @param {Object} context - context
 * @param {Function} context.query - query function
 * @param {Object} card - card
 * @param {String} name - link name
 * @param {Object} linkSchema - link JSON Schema
 * @returns {Object[]} link results
 *
 * @example
 * const results = links.evaluate({ ... }, {
 *   type: 'foo',
 *   data: {}
 * }, 'is attached to', {
 *   type: 'object',
 *   required: [ 'type' ],
 *   properties: {
 *     type: {
 *       type: 'string',
 *       const: 'message'
 *     }
 *   }
 * })
 *
 * for (const result of results) {
 *   console.log(result)
 * }
 */
exports.evaluate = async (context, card, name, linkSchema) => {
	// TODO: These types of links are hardcoded, but in the
	// future, we should represent all link types using link
	// cards, and modify this function to take a look at those
	// cards to resolve the link requests.

	switch (name) {
		case 'is attached to': {
			const targetId = card.data && card.data.target
			if (!targetId) {
				return []
			}

			return jsonSchema.filter(linkSchema, await context.query({
				type: 'object',
				required: [ 'id' ],
				additionalProperties: true,
				properties: {
					id: {
						type: 'string',
						const: targetId
					}
				}
			}))
		}
		case 'has attached element': {
			const querySchema = jsonSchema.merge([
				{
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'target' ],
							properties: {
								target: {
									type: 'string',
									const: card.id
								}
							}
						}
					}
				},
				linkSchema
			])

			return jsonSchema.filter(querySchema, await context.query(querySchema))
		}
		default: {
			throw new errors.JellyfishUnknownLinkType(`Unknown link: ${name}`)
		}
	}
}

/**
 * @summary Evaluate all links from a card
 * @function
 * @public
 *
 * @param {Object} context - context
 * @param {Function} context.query - query function
 * @param {Object} card - card
 * @param {Object} schema - links definition schema
 * @returns {(Object|Null)} resulting links
 *
 * @example
 * const results = links.evaluateCard({ ... }, {
 *   type: 'foo',
 *   data: {}
 * }, {
 *   'is attached to', {
 *     type: 'object',
 *     required: [ 'type' ],
 *     properties: {
 *       type: {
 *         type: 'string',
 *         const: 'message'
 *       }
 *     }
 *   }
 * })
 *
 * for (const result of results['is attached to']) {
 *   console.log(result)
 * }
 */
exports.evaluateCard = async (context, card, schema) => {
	const result = {}

	for (const name of Object.keys(schema)) {
		result[name] = await exports.evaluate(context, card, name, schema[name])

		// Abort at the first link evaluation error
		if (result[name].length === 0) {
			return null
		}
	}

	return result
}
