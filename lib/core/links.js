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

const Bluebird = require('bluebird')
const jsonSchema = require('./json-schema')

const resolveLink = (linkCard, linkName, id) => {
	if (linkCard.name === linkName && linkCard.data.from === id) {
		return linkCard.data.to
	}

	if (linkCard.data.inverseName === linkName && linkCard.data.to === id) {
		return linkCard.data.from
	}

	return null
}

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
	const linkCards = await context.query({
		type: 'object',
		required: [ 'id', 'type', 'name', 'active', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'link'
			},
			name: {
				type: 'string'
			},
			active: {
				type: 'boolean',
				const: true
			},
			data: {
				type: 'object',
				required: [ 'inverseName', 'from', 'to' ],
				properties: {
					inverseName: {
						type: 'string'
					},
					from: {
						type: 'string'
					},
					to: {
						type: 'string'
					}
				}
			}
		}
	})

	return Bluebird.reduce(linkCards, async (accumulator, linkCard) => {
		const id = resolveLink(linkCard, name, card.id)
		if (!id) {
			return accumulator
		}

		const cards = await context.query({
			type: 'object',
			required: [ 'id', 'active' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: id
				},
				active: {
					type: 'boolean',
					const: true
				}
			}
		})

		const result = jsonSchema.filter(linkSchema, cards) || []
		return accumulator.concat(result.map((linkedCard) => {
			linkedCard.$link = linkCard.id
			return linkedCard
		}))
	}, [])
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
