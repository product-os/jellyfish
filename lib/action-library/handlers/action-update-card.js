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

	assert.USER(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${card.type}`)

	const result = await context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		reason: request.arguments.reason,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, _.omit(card, [ 'type' ]), request.arguments.patch)

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
