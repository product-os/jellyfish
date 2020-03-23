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

const getUserByEmail = async ({
	session,
	query,
	userEmail
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
			data: {
				type: 'object',
				required: [ 'hash', 'email' ],
				additionalProperties: false,
				properties: {
					email: {
						anyOf: [
							{
								type: 'array',
								contains: {
									type: 'string',
									const: userEmail
								}
							},
							{
								type: 'string',
								const: userEmail
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
	session,
	request,
	passwordResetCard,
	user
}) => {
	const linkTypeCard = await context.getCardBySlug(session, 'link@1.0.0')
	await context.insertCard(session, linkTypeCard, {
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
	session,
	context,
	card,
	user,
	resetToken
}) => {
	const resetPasswordUrl = `https://jel.ly.fish/reset_password/${resetToken}`

	const request = {
		arguments: {
			fromAddress: `no-reply@${MAILGUN.domain}`,
			toAddress: user.data.email,
			subject: 'Jellyfish Password Reset',
			html: `<p>Hello,</p><p>We have received a password reset request for the Jellyfish account attached to this email.</p><p>Please use the link below to reset your password:</p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a><p>Cheers</p><p>Jellyfish Team</p><a href="https://jel.ly.fish">https://jel.ly.fish</a>`
		}
	}

	return sendEmailHandler(session, context, card, request)
}

const handler = async (session, context, card, request) => {
	const user = await getUserByEmail({
		session,
		query: context.query,
		userEmail: request.arguments.email
	})
	if (
		user &&
		user.data &&
		user.data.hash !== PASSWORDLESS_USER_HASH) {
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
				session,
				request,
				passwordResetCard,
				user
			})
			await sendEmail({
				session,
				context,
				card,
				user,
				resetToken: passwordResetCard.data.resetToken
			})
		} catch (error) {
			logger.warn(request.context, 'Failed to request password reset', {
				id: user.id,
				slug: user.slug,
				type: user.type,
				error
			})
		}
	}
	return {
		id: request.id,
		type: request.type,
		version: request.version,
		slug: request.slug
	}
}

module.exports = {
	handler
}
