/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const assert = require('../../assert')

const handler = async (session, context, card, request) => {
	const typeCard = await context.getCardBySlug(
		session, `${request.arguments.type}@1.0.0`)

	// In most cases, the `card` argument will contain all the information we
	// need, but in some instances (for example when the guest user session
	// creates a new user), `card` will be missing certain fields due to
	// a permission filter being applied. The full card is loaded using
	// a privileged sessions so that we can ensure all required fields are
	// present.
	const fullCard = await context.getCardById(
		context.privilegedSession,
		card.id)

	assert.USER(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${request.arguments.type}`)

	const data = {
		timestamp: request.timestamp,
		target: fullCard.id,
		actor: request.actor,
		payload: request.arguments.payload
	}

	const result = await context.insertCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, {
		slug: request.arguments.slug || await context.getEventSlug(typeCard.slug),
		version: '1.0.0',
		name: request.arguments.name || null,
		tags: request.arguments.tags || [],

		// Events always inherit the head cards markers
		markers: fullCard.markers,
		data
	}).catch((error) => {
		// This is a user error
		if (error.name === 'JellyfishElementAlreadyExists') {
			error.expected = true
		}

		throw error
	})

	const linkTypeCard = await context.getCardBySlug(session, 'link@1.0.0')

	// Create a link card between the event and its target
	await context.insertCard(session, linkTypeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, {
		slug: await context.getEventSlug('link', data),
		type: 'link@1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: result.id,
				type: result.type
			},
			to: {
				id: fullCard.id,
				type: fullCard.type
			}
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
