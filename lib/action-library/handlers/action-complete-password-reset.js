/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const bcrypt = require('bcrypt')
const assert = require('../../assert')

const {
	BCRYPT_SALT_ROUNDS
} = require('./constants')

const pre = async (session, context, request) => {
	// Convert the plaintext password into a hash so that we don't have a plain password stored in the DB
	request.arguments.newPassword = await bcrypt.hash(
		request.arguments.newPassword, BCRYPT_SALT_ROUNDS)
	return request.arguments
}

const getPasswordResetCard = async (context, request) => {
	const [ passwordReset ] = await context.query(context.privilegedSession, {
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					active: {
						type: 'boolean',
						const: true
					}
				}
			}
		},
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			active: {
				type: 'boolean',
				const: true
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				properties: {
					resetToken: {
						type: 'string',
						const: request.arguments.resetToken
					}
				},
				required: [ 'resetToken' ]
			}
		}
	}, {
		limit: 1
	})
	return passwordReset
}

const invalidatePasswordReset = async ({
	session,
	request,
	passwordReset,
	context
}) => {
	const typeCard = await context.getCardBySlug(session, 'password-reset@1.0.0')
	return context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, passwordReset, [
		{
			op: 'replace',
			path: '/active',
			value: false
		}
	])
}

const handler = async (session, context, card, request) => {
	const passwordReset = await getPasswordResetCard(context, request)
	assert.USER(request.context, passwordReset, context.errors.WorkerAuthenticationError, 'Reset token invalid')

	await invalidatePasswordReset({
		session: context.privilegedSession,
		request,
		passwordReset,
		context
	})

	const [ user ] = passwordReset.links['is attached to']

	assert.USER(request.context, user, context.WorkerAuthenticationError, 'Reset token invalid')

	const hasExpired = new Date(passwordReset.data.expiresAt) < new Date()
	if (hasExpired) {
		const newError = new context.errors.WorkerAuthenticationError('Password reset token has expired')
		newError.expected = true
		throw newError
	}

	const userTypeCard = await context.getCardBySlug(session, 'user@latest')

	return context.patchCard(context.privilegedSession, userTypeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, user, [
		{
			op: 'replace',
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
