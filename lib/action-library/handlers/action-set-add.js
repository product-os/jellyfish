/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')

const handler = async (session, context, card, request) => {
	const current = _.get(card, request.arguments.property)
	const source = current || []
	const initialLength = source.length
	const input = _.isArray(request.arguments.value)
		? request.arguments.value
		: [ request.arguments.value ]

	for (const element of input) {
		if (!_.includes(source, element)) {
			source.push(element)
		}
	}

	if (initialLength === source.length) {
		return {
			id: card.id,
			type: card.type,
			version: card.version,
			slug: card.slug
		}
	}

	const typeCard = await context.getCardBySlug(
		session, card.type)

	const path = _.isString(request.arguments.property)
		? `/${request.arguments.property.replace(/\./g, '/')}`
		: `/${request.arguments.property.join('/')}`

	const result = await context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, card, [
		{
			op: current ? 'replace' : 'add',
			path,
			value: source
		}
	])

	if (!result) {
		return null
	}

	return {
		id: result.id,
		type: result.type,
		version: result.version,
		slug: result.slug
	}
}

module.exports = {
	handler
}
