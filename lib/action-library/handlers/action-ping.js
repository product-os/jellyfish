/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const handler = async (session, context, card, request) => {
	const result = await context.replaceCard(session, card, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		reason: 'Ping',

		// So that we don't infinitely materialize links
		// in the ping card.
		attachEvents: false
	}, {
		slug: request.arguments.slug,
		version: '1.0.0',
		data: {
			timestamp: request.timestamp
		}
	})

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
