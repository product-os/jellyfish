/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const bcrypt = require('bcrypt')
const _ = require('lodash')
const actionCreateSession = require('./action-create-session')
const assert = require('@balena/jellyfish-assert')
const {
	BCRYPT_SALT_ROUNDS,
	PASSWORDLESS_USER_HASH
} = require('./constants')

const pre = async (session, context, request) => {
	const card = await context.getCardById(context.privilegedSession, request.card)
	const isFirstTimePassword =
		card &&
		card.data &&
		card.data.hash === PASSWORDLESS_USER_HASH &&
		!request.arguments.currentPassword

	const loginResult = isFirstTimePassword
		? {
			password: null
		}

	// This call will throw if the current password is incorrect.
		: await actionCreateSession.pre(session, context, {
			card: request.card,
			context: request.context,
			timestamp: request.timestamp,
			actor: request.actor,
			originator: request.originator,
			arguments: {
				password: String(request.arguments.currentPassword)
			}
		})

	// Don't store passwords in plain text
	request.arguments.currentPassword = loginResult.password
	request.arguments.newPassword = await bcrypt.hash(
		request.arguments.newPassword, BCRYPT_SALT_ROUNDS)

	return request.arguments
}

const handler = async (session, context, card, request) => {
	const typeCard = await context.getCardBySlug(
		session, card.type)

	assert.INTERNAL(request.context, typeCard,
		context.errors.WorkerNoElement, `No such type: ${card.type}`)

	return context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, _.omit(card, [ 'type' ]), [
		{
			op: request.arguments.currentPassword ? 'replace' : 'add',
			path: '/data/hash',
			value: request.arguments.newPassword
		}
	]).catch((error) => {
		// A schema mismatch here means that the patch could
		// not be applied to the card due to permissions.
		if (error.name === 'JellyfishSchemaMismatch') {
			const newError = new context.errors.WorkerAuthenticationError(
				'Password change not allowed')
			newError.expected = true
			throw newError
		}

		throw error
	})
}

module.exports = {
	pre,
	handler
}
