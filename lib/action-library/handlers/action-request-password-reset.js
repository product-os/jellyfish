/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const crypto = require('crypto')
const Bluebird = require('bluebird')
const logger = require('../../logger').getLogger(__filename)
const environment = require('../../environment')
const sendEmailHandler = require('./action-send-email').handler
const {
	PASSWORDLESS_USER_HASH
} = require('./constants')

const MAILGUN = environment.mail
const ACTIONS = environment.actions

const getUserBySlug = async ({
	session,
	query,
	username
}) => {
	const [ user ] = await query(session, {
		type: 'object',
		required: [ 'id', 'type', 'active', 'data' ],
		additionalProperties: false,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user@1.0.0'
			},
			active: {
				type: 'boolean',
				const: true
			},
			slug: {
				type: 'string',
				const: `user-${username}`
			},
			data: {
				type: 'object',
				required: [ 'hash', 'email' ],
				additionalProperties: false,
				properties: {
					hash: {
						type: 'string'
					},
					email: {
						anyOf: [
							{
								type: 'array',
								contains: {
									type: 'string'
								}
							},
							{
								type: 'string'
							}
						]
					}
				}
			}
		}
	}, {
		limit: 1
	})
	return user
}

const invalidatePreviousPasswordResets = async ({
	context,
	userId,
	request,
	typeCard
}) => {
	const previousPasswordResets = await context.query(context.privilegedSession, {
		type: 'object',
		require: [ 'type', 'id' ],
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: userId
					}
				}
			}
		}
	})

	if (previousPasswordResets.length > 0) {
		await Bluebird.all(previousPasswordResets.map((passwordReset) => {
			return context.patchCard(context.privilegedSession, typeCard, {
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
		}))
	}
}

const addPasswordResetCard = async ({
	context,
	user,
	request,
	typeCard
}) => {
	const resetToken = crypto.createHmac('sha256', ACTIONS.resetPasswordSecretToken)
		.update(user.data.hash)
		.digest('hex')
	const requestedAt = new Date()
	const hourInFuture = requestedAt.setHours(requestedAt.getHours() + 1)
	const expiresAt = new Date(hourInFuture)
	return context.insertCard(context.privilegedSession, typeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: true
	}, {
		version: '1.0.0',
		slug: await context.getEventSlug('password-reset'),
		data: {
			expiresAt: expiresAt.toISOString(),
			requestedAt: requestedAt.toISOString(),
			resetToken
		}
	})
}

const addLinkCard = async ({
	context,
	request,
	passwordResetCard,
	user
}) => {
	const linkTypeCard = await context.getCardBySlug(context.privilegedSession, 'link@1.0.0')
	await context.insertCard(context.privilegedSession, linkTypeCard, {
		timestamp: request.timestamp,
		actor: request.actor,
		originator: request.originator,
		attachEvents: false
	}, {
		slug: await context.getEventSlug('link'),
		type: 'link@1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has requested',
			from: {
				id: passwordResetCard.id,
				type: passwordResetCard.type
			},
			to: {
				id: user.id,
				type: user.type
			}
		}
	})
}

const sendEmail = async ({
	context,
	card,
	user,
	resetToken
}) => {
	let userEmail = user.data.email
	if (Array.isArray(userEmail)) {
		userEmail = userEmail[0]
	}

	const resetPasswordUrl = `https://jel.ly.fish/password_reset/${resetToken}`

	const request = {
		arguments: {
			fromAddress: `no-reply@${MAILGUN.domain}`,
			toAddress: userEmail,
			subject: 'Jellyfish Password Reset',
			html: `<p>Hello,</p><p>We have received a password reset request for the Jellyfish account attached to this email.</p><p>Please use the link below to reset your password:</p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a><p>Cheers</p><p>Jellyfish Team</p><a href="https://jel.ly.fish">https://jel.ly.fish</a>`
		}
	}

	return sendEmailHandler(context.privilegedSession, context, card, request)
}

const handler = async (session, context, card, request) => {
	const username = request.arguments.username
	const response = {
		id: card.id,
		type: card.type,
		version: card.version,
		slug: card.slug
	}

	const user = await getUserBySlug({
		session: context.privilegedSession,
		query: context.query,
		username
	})

	if (!user) {
		logger.warn(request.context, `Could not find user with username ${username}`)
		return response
	}

	if (!user.data || !user.data.hash) {
		logger.warn(request.context,
			`Session does not have the correct permissions to request the hash of the user with username ${username}`,
			{
				queryReturned: user
			})
		return response
	}

	if (user.data.hash === PASSWORDLESS_USER_HASH) {
		logger.warn(request.context, `User with username ${username} has no hash set`)
		return response
	}

	try {
		const typeCard = await context.getCardBySlug(context.privilegedSession, 'password-reset@1.0.0')
		await invalidatePreviousPasswordResets({
			context,
			userId: user.id,
			request,
			typeCard
		})
		const passwordResetCard = await addPasswordResetCard({
			request,
			context,
			user,
			typeCard
		})
		await addLinkCard({
			context,
			request,
			passwordResetCard,
			user
		})
		await sendEmail({
			context,
			card,
			user,
			resetToken: passwordResetCard.data.resetToken
		})
	} catch (error) {
		logger.warn(request.context,
			`Failed to request password reset for user with username ${username}`,
			{
				id: user.id,
				slug: user.slug,
				type: user.type,
				error
			})
	}
	return response
}

module.exports = {
	handler
}
