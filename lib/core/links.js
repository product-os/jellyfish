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
const jsonSchema = require('./json-schema')
const LINK_ORIGIN_PROPERTY = '$link'
const LINK_MAX = 100

/**
 * @summary Evaluate a card link
 * @function
 * @private
 *
 * @description
 * This function is exported for testability purposes.
 *
 * @param {Object} context - context
 * @param {Function} context.getElementsById - get function
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
	const totalLinks = (card.links && card.links[name]) || []

	// Impose a limit on the amount of links for a given type that
	// we are willing to evaluate. If this is infinite and the
	// amount of links if very big, then the user can DDoS the service.
	// We slice from the end to make sure we always evaluate the
	// last X events, which are most likely the most interesting ones.
	const links = totalLinks.length > LINK_MAX
		? totalLinks.slice(totalLinks.length - LINK_MAX)
		: totalLinks

	const cards = (await context.getElementsById(_.map(links, 'id'), {
		// TODO: Don't harcode the type
		type: 'card'
	})).map((result, index) => {
		// We will never expand inactive cards
		if (!result.active) {
			return null
		}

		return result
	})

	return jsonSchema.filter(linkSchema, cards) || []
}

/**
 * @summary Evaluate all links from a card
 * @function
 * @public
 *
 * @param {Object} context - context
 * @param {Function} context.getElementsById - get function
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

		if (result[name].length === 0 && schema[name]) {
			return null
		}

		// Negated link, but we found results
		if (result[name].length !== 0 && !schema[name]) {
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
 * @param {Object} joinedCard - the card that is linked via linkCard
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
exports.parseCard = (linkCard, card, joinedCard = {}) => {
	const fromId = linkCard.data.from.id || linkCard.data.from
	const toId = linkCard.data.to.id || linkCard.data.to

	if (fromId === card.id) {
		return {
			name: linkCard.name,
			id: toId,
			slug: joinedCard.slug,
			type: joinedCard.type
		}
	}

	if (toId === card.id) {
		return {
			name: linkCard.data.inverseName,
			id: fromId,
			slug: joinedCard.slug,
			type: joinedCard.type
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
 * @param {Object} joinedCard - the card that is linked via linkCard
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
exports.addLink = (linkCard, card, joinedCard) => {
	const result = exports.parseCard(linkCard, card, joinedCard)
	if (!result) {
		return card
	}

	if (!card.links) {
		card.links = {}
	}

	const position = _.findIndex(card.links[result.name], [
		LINK_ORIGIN_PROPERTY,
		linkCard.id
	])

	const index = position === -1 ? _.size(card.links[result.name]) : position
	card.links[result.name] = card.links[result.name] || []
	card.links[result.name][index] = {
		[LINK_ORIGIN_PROPERTY]: linkCard.id,
		id: result.id,
		slug: result.slug,
		type: result.type
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
