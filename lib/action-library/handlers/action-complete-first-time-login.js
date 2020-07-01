/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const assert = require('@balena/jellyfish-assert')
const {
	PASSWORDLESS_USER_HASH
} = require('./constants')

const getFirstTimeLoginCard = async (context, request) => {
	const [ firstTimeLogin ] = await context.query(context.privilegedSession, {
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
		required: [ 'type', 'links', 'active', 'data' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
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
					firstTimeLoginToken: {
						type: 'string',
						const: request.arguments.firstTimeLoginToken
					}
				},
				required: [ 'firstTimeLoginToken' ]
			}
		}
	}, {
		limit: 1
	})
	return firstTimeLogin
}

const invalidateFirstTimeLogin = async ({
	session,
	request,
	firstTimeLogin,
	context
}) => {
	const typeCard = await context.getCardBySlug(session, 'first-time-login@latest')
	return context.patchCard(session, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, firstTimeLogin, [
		{
			op: 'replace',
			path: '/active',
			value: false
		}
	])
}

const handler = async (session, context, card, request) => {
	const firstTimeLogin = await getFirstTimeLoginCard(context, request)
	assert.USER(request.context, firstTimeLogin, context.errors.WorkerAuthenticationError, 'First-time login token invalid')

	await invalidateFirstTimeLogin({
		session: context.privilegedSession,
		request,
		firstTimeLogin,
		context
	})

	const [ user ] = firstTimeLogin.links['is attached to']

	assert.USER(request.context, user, context.errors.WorkerAuthenticationError, 'First-time login token invalid')

	const hasExpired = new Date(firstTimeLogin.data.expiresAt) < new Date()
	if (hasExpired) {
		const newError = new context.errors.WorkerAuthenticationError('First-time login token has expired')
		newError.expected = true
		throw newError
	}

	const isFirstTimeLogin = user.data.hash === PASSWORDLESS_USER_HASH

	assert.USER(request.context, isFirstTimeLogin, context.errors.WorkerAuthenticationError, 'User already has a password set')

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
		console.dir(error, {
			depth: null
		})

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
	handler
}
