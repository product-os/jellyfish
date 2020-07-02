/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('@balena/jellyfish-assert')

const handler = async (session, context, card, request) => {
	const typeCard = await context.getCardBySlug(
		session, card.type)

	assert.INTERNAL(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${card.type}`)

	const current = _.get(card, request.arguments.path)
	const result = await context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		reason: request.arguments.reason,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, card, [
		{
			op: _.isNumber(current) ? 'replace' : 'add',
			path: `/${request.arguments.path.join('/')}`,
			value: (current || 0) + 1
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
