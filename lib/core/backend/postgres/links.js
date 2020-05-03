/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const logger = require('../../../logger').getLogger(__filename)

const LINK_ORIGIN_PROPERTY = '$link'
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
		[ 'idx_link_to', 'toId' ],
		[ 'idx_links_fromid_name', 'fromid, name' ],
		[ 'idx_links_toid_inversename', 'toid, inversename' ]
	]) {
		if (indexes.includes(name)) {
			return
		}

		logger.debug(context, 'Attempting to create table index', {
			table: LINK_TABLE,
			database,
			index: name
		})

		await connection.any(`
			CREATE INDEX IF NOT EXISTS ${name} ON ${LINK_TABLE}
			USING BTREE (${column})`)
	}
}

exports.upsert = async (context, connection, link) => {
	if (link.active) {
		const sql = `
			INSERT INTO ${LINK_TABLE} VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (id) DO UPDATE SET
				slug = $2,
				name = $3,
				inverseName = $4,
				fromId = $5,
				toId = $6
		`
		await connection.any({
			name: `links-upsert-insert-${LINK_TABLE}`,
			text: sql,
			values: [
				link.id,
				link.slug,
				link.name,
				link.data.inverseName,
				link.data.from.id,
				link.data.to.id
			]
		})
	} else {
		const sql = `
			DELETE FROM ${LINK_TABLE} WHERE id = $1`
		await connection.any({
			name: `links-upsert-delete-${LINK_TABLE}`,
			text: sql,
			values: [ link.id ]
		})
	}
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
