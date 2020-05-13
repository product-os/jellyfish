/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const LINK_TABLE = 'links'

exports.TABLE = LINK_TABLE

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
		linkCard.id
	])

	return card
}

exports.getLinkTypeSlug = (type) => {
	return type.toLowerCase().replace(/[^a-z]/g, '_')
}
