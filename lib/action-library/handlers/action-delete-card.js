/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('@balena/jellyfish-assert')

const handler = async (session, context, card, request) => {
	if (!card.active) {
		return {
			id: card.id,
			type: card.type,
			version: card.version,
			slug: card.slug
		}
	}

	const typeCard = await context.getCardBySlug(
		session, card.type)
	assert.USER(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${card.type}`)

	const result = await context.patchCard(
		context.privilegedSession, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			originator: request.originator,
			attachEvents: true
		}, _.omit(card, [ 'type' ]), [
			{
				op: 'replace',
				path: '/active',
				value: false
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
