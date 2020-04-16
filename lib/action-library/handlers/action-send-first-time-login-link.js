/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const assert = require('../../assert')
const uuid = require('../../uuid')
const environment = require('../../environment')
const sendEmailHandler = require('./action-send-email').handler

const MAILGUN = environment.mail

const queryUserOrgs = async ({
	userId,
	context
}) => {
	return context.query(context.privilegedSession, {
		$$links: {
			'has member': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: userId
					},
					type: {
						type: 'string',
						const: 'user@1.0.0'
					}
				}
			}
		},
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'org@1.0.0'
			},
			links: {
				type: 'object'
			}
		}
	})
}

const invalidatePreviousFirstTimeLogins = async ({
	context,
	request,
	userId,
	typeCard
}) => {
	const previousFirstTimeLogins = await context.query(context.privilegedSession, {
		type: 'object',
		require: [ 'type', 'id' ],
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'first-time-login@1.0.0'
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

	if (previousFirstTimeLogins.length > 0) {
		await Bluebird.all(previousFirstTimeLogins.map((firstTimeLogin) => {
			return context.patchCard(context.privilegedSession, typeCard, {
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
		}))
	}
}

const addFirstTimeLogin = async ({
	context,
	request,
	typeCard
}) => {
	const firstTimeLoginToken = await uuid.random()
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
		slug: await context.getEventSlug('first-time-login'),
		data: {
			expiresAt: expiresAt.toISOString(),
			requestedAt: requestedAt.toISOString(),
			firstTimeLoginToken
		}
	})
}

const addLinkCard = async ({
	context,
	request,
	firstTimeLoginCard,
	userCard
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
				id: firstTimeLoginCard.id,
				type: firstTimeLoginCard.type
			},
			to: {
				id: userCard.id,
				type: userCard.type
			}
		}
	})
}

const sendEmail = async ({
	context,
	card,
	userCard,
	firstTimeLoginToken
}) => {
	let userEmail = userCard.data.email
	if (Array.isArray(userEmail)) {
		userEmail = userEmail[0]
	}

	const firstTimeLoginUrl = `https://jel.ly.fish/first_time_login/${firstTimeLoginToken}`

	const username = userCard.slug.replace(/^user-/g, '')

	const request = {
		arguments: {
			fromAddress: `no-reply@${MAILGUN.domain}`,
			toAddress: userEmail,
			subject: 'Jellyfish First Time Login',
			html: `<p>Hello,</p><p>Here is a link to login to your new Jellyfish account ${username}.</p><p>Please use the link below to set your password and login:</p><a href="${firstTimeLoginUrl}">${firstTimeLoginUrl}</a><p>Cheers</p><p>Jellyfish Team</p><a href="https://jel.ly.fish">https://jel.ly.fish</a>`
		}
	}

	return sendEmailHandler(context.priviledgedSession, context, card, request)
}

const checkOrgs = async ({
	context,
	request,
	userCard
}) => {
	const requesterOrgs = await queryUserOrgs({
		context,
		userId: request.actor
	})
	assert.USER(request.context, requesterOrgs.length > 0, context.errors.WorkerNoElement,
		'You do not belong to an organisation and thus cannot send a first-time login link to any users')

	const userOrgs = await queryUserOrgs({
		context,
		userId: userCard.id
	})
	assert.USER(request.context, userOrgs.length > 0, context.errors.WorkerNoElement,
		`User with slug ${userCard.slug} is not a member of any organisations`)

	const sharedOrgs = _.intersectionBy(userOrgs, requesterOrgs, 'id')
	assert.USER(request.context, sharedOrgs.length > 0, context.errors.WorkerAuthenticationError,
		`User with slug ${userCard.slug} is not a member of any of your organisations`)
}

const handler = async (session, context, userCard, request) => {
	const typeCard = await context.getCardBySlug(session, 'first-time-login@latest')

	assert.USER(request.context, typeCard, context.errors.WorkerNoElement, 'No such type: first-time-login')

	assert.USER(request.context, userCard.active, context.errors.WorkerNoElement, `User with slug ${userCard.slug} is not active`)

	await checkOrgs({
		request,
		userCard,
		context
	})

	await invalidatePreviousFirstTimeLogins({
		context,
		userId: userCard.id,
		typeCard,
		request
	})
	const firstTimeLoginCard = await addFirstTimeLogin({
		request,
		context,
		typeCard
	})
	await addLinkCard({
		context,
		request,
		firstTimeLoginCard,
		userCard
	})
	await sendEmail({
		context,
		userCard,
		firstTimeLoginToken: firstTimeLoginCard.data.firstTimeLoginToken
	})
	return {
		id: userCard.id,
		type: userCard.type,
		version: userCard.version,
		slug: userCard.slug
	}
}

module.exports = {
	handler
}
