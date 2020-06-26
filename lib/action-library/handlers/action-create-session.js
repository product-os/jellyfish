/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const bcrypt = require('bcrypt')
const uuid = require('../../uuid')
const assert = require('../../assert')
const isUUID = require('is-uuid').v4

const pre = async (session, context, request) => {
	const userCard = isUUID(request.card)
		? await context.getCardById(session, request.card)
		: await context.getCardBySlug(session, `${request.card}@latest`)

	assert.USER(request.context, userCard,
		context.errors.WorkerAuthenticationError, 'Incorrect username or password')

	const fullUser = await context.getCardById(
		context.privilegedSession, userCard.id)

	assert.USER(request.context,
		fullUser.data.hash,
		context.errors.WorkerAuthenticationError, 'Login disallowed')

	const matches = await bcrypt.compare(
		request.arguments.password,
		fullUser.data.hash)
	assert.USER(request.context, matches,
		context.errors.WorkerAuthenticationError, 'Invalid password')

	// Don't store the plain text password in the
	// action request as we don't need it anymore.
	request.arguments.password = 'CHECKED IN PRE HOOK'

	return request.arguments
}

const handler = async (session, context, card, request) => {
	const user = await context.getCardById(
		context.privilegedSession, card.id)

	assert.USER(request.context, user,
		context.errors.WorkerAuthenticationError, `No such user: ${card.id}`)
	assert.USER(request.context,
		user.data.hash,
		context.errors.WorkerAuthenticationError, 'Login disallowed')

	const sessionTypeCard = await context.getCardBySlug(
		session, 'session@1.0.0')

	assert.USER(request.context,
		sessionTypeCard,
		context.errors.WorkerNoElement, 'No such type: session')

	// Set the expiration date to be 7 days from now
	const expirationDate = new Date()
	expirationDate.setDate(expirationDate.getDate() + 7)

	/*
	 * This allows us to differentiate two login requests
	 * coming on the same millisecond, unlikely but possible.
	 */
	const suffix = await uuid.random()

	const result = await context.insertCard(
		context.privilegedSession, sessionTypeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			originator: request.originator,
			attachEvents: true
		}, {
			version: '1.0.0',
			slug: `session-${user.slug}-${request.epoch}-${suffix}`,
			data: {
				actor: card.id,
				expiration: expirationDate.toISOString()
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
	pre,
	handler
}
