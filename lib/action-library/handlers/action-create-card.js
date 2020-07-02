/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const skhema = require('skhema')
const uuid = require('@balena/jellyfish-uuid')
const assert = require('@balena/jellyfish-assert')

const slugify = (string) => {
	return string
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

const handler = async (session, context, card, request) => {
	assert.INTERNAL(request.context,
		!skhema.isValid(context.cards.event.data.schema, request.arguments.properties),
		Error, 'You may not use card actions to create an event')

	if (!request.arguments.properties.slug) {
		const id = await uuid.random()

		// Auto-generate a slug by joining the type, the name, and a uuid
		request.arguments.properties.slug =
			slugify(`${card.slug}-${request.arguments.properties.name || ''}-${id}`)
	}

	const result = await context.insertCard(session, card, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		reason: request.arguments.reason,
		attachEvents: true
	}, request.arguments.properties)

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
