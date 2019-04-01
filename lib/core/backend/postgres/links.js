/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const skhema = require('skhema')
const logger = require('../../../logger').getLogger(__filename)

const LINK_ORIGIN_PROPERTY = '$link'
const LINK_MAX = 100
const LINK_TABLE = 'links'

exports.TABLE = LINK_TABLE

exports.setup = async (context, connection, database, options) => {
	logger.debug(context, 'Creating links table', {
		table: LINK_TABLE,
		database
	})

	await connection.any(`
		CREATE TABLE IF NOT EXISTS ${LINK_TABLE} (
			id UUID PRIMARY KEY NOT NULL,
			slug VARCHAR (255) UNIQUE NOT NULL,
			name TEXT NOT NULL,
			inverseName TEXT NOT NULL,
			fromId UUID REFERENCES ${options.cards} (id) NOT NULL,
			toId UUID REFERENCES ${options.cards} (id) NOT NULL)`)

	const indexes = _.map(await connection.any(`
		SELECT * FROM pg_indexes WHERE tablename = '${LINK_TABLE}'`),
	'indexname')

	for (const [ name, column ] of [
		[ 'idx_link_from', 'fromId' ],
		[ 'idx_link_to', 'toId' ]
	]) {
		if (indexes.includes(name)) {
			return
		}

		await connection.any(`
			CREATE INDEX ${name} ON ${LINK_TABLE}
			USING BTREE (${column})`)
	}
}

exports.upsert = async (context, connection, link) => {
	if (link.active) {
		await connection.any(`
			INSERT INTO ${LINK_TABLE} VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO UPDATE SET
				slug = $2,
				name = $3,
				inverseName = $4,
				fromId = $5,
				toId = $6
		`, [
			link.id,
			link.slug,
			link.name,
			link.data.inverseName,
			link.data.from.id,
			link.data.to.id
		])
	} else {
		await connection.any(`
			DELETE FROM ${LINK_TABLE} WHERE id = $1`, [
			link.id
		])
	}
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

	const cardSets = {}
	for (const link of links) {
		cardSets[link.type] = cardSets[link.type] || []
		cardSets[link.type].push(link.id)
	}

	const objects = []
	for (const type of Object.keys(cardSets)) {
		const elements = await context.getElementsById(cardSets[type], {
			type
		})

		objects.push(...elements.map((result, index) => {
			// We will never expand inactive cards
			if (!result.active) {
				return null
			}

			return result
		}))
	}

	return skhema.filter(linkSchema, objects) || []
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
			type: joinedCard.type,
			created_at: linkCard.created_at
		}
	}

	if (toId === card.id) {
		return {
			name: linkCard.data.inverseName,
			id: fromId,
			slug: joinedCard.slug,
			type: joinedCard.type,
			created_at: linkCard.created_at
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

	if (!card.linked_at) {
		card.linked_at = {}
	}

	card.linked_at[result.name] = result.created_at

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

exports.getLinkTypeSlug = (type) => {
	return type.toLowerCase().replace(/[^a-z]/g, '_')
}
