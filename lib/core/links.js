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
const _ = require('lodash')
const jsonSchema = require('./json-schema')
const LINK_ORIGIN_PROPERTY = '$link'

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
			linkedCard[LINK_ORIGIN_PROPERTY] = linkCard.id

			// Don't resolve sub-links, at least for now
			if (linkedCard.links) {
				linkedCard.links = {}
			}

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

/**
 * @summary Parse a card link given a link card
 * @function
 * @private
 *
 * @param {Object} linkCard - link card
 * @param {Object} card - other card
 * @returns {(Null|Object)} results
 *
 * @example
 * const result = links.parseCard({
 *   name: 'is attached to',
 *   data: {
 *     inverseName: 'has attached element',
 *     from: 'xxxx',
 *     to: 'yyyy'
 *   }
 * }, {
 *   id: 'xxxx',
 *   ...
 * })
 *
 * if (result) {
 *   console.log(result.name)
 *   console.log(result.id)
 * }
 *
 * > 'is attached to'
 * > 'yyy'
 */
exports.parseCard = (linkCard, card) => {
	if (linkCard.data.from === card.id) {
		return {
			name: linkCard.name,
			id: linkCard.data.to
		}
	}

	if (linkCard.data.to === card.id) {
		return {
			name: linkCard.data.inverseName,
			id: linkCard.data.from
		}
	}

	return null
}

/**
 * @summary Add a link to the "links" materialized view
 * @function
 * @public
 *
 * @param {Object} linkCard - link card
 * @param {Object} card - card to modify
 * @returns {Object} card
 *
 * @example
 * const card = links.addLink({
 *   type: 'link',
 *   ...
 * }, {
 *   type: 'foo',
 *   ...
 * })
 *
 * console.log(card.links)
 */
exports.addLink = (linkCard, card) => {
	const result = exports.parseCard(linkCard, card)
	if (!result || !card.links) {
		return card
	}

	const position = _.findIndex(card.links[result.name], [
		LINK_ORIGIN_PROPERTY,
		linkCard.id
	])

	const index = position === -1 ? _.size(card.links[result.name]) : position
	card.links[result.name] = card.links[result.name] || []
	card.links[result.name][index] = {
		[LINK_ORIGIN_PROPERTY]: linkCard.id,
		id: result.id
	}

	return card
}

/**
 * @summary Remove a link from the "links" materialized view
 * @function
 * @public
 *
 * @param {Object} linkCard - link card
 * @param {Object} card - card to modify
 * @returns {Object} card
 *
 * @example
 * const card = links.removeLink({
 *   type: 'link',
 *   ...
 * }, {
 *   type: 'foo',
 *   ...
 * })
 *
 * console.log(card.links)
 */
exports.removeLink = (linkCard, card) => {
	const result = exports.parseCard(linkCard, card)
	if (!result || !card.links || !card.links[result.name]) {
		return card
	}

	card.links[result.name] = _.reject(card.links[result.name], [
		LINK_ORIGIN_PROPERTY,
		linkCard.id
	])

	return card
}
