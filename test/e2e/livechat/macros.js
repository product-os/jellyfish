/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	v4: uuid
} = require('uuid')
const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('../../../lib/environment')

exports.createThreads = async (context, start, count) => {
	const threads = []
	const markers = [ `${context.supportUser.card.slug}+${context.supportUser.org.slug}` ]

	for (let index = start; index < start + count; index++) {
		const thread = await context.supportUser.sdk.card.create({
			type: 'support-thread@1.0.0',
			name: `Thread subject ${index}`,
			markers,
			data: {
				product: 'jellyfish',
				status: 'open'
			}
		})

		threads.push(thread)
	}

	return threads
}

exports.getRenderedConversationIds = async (context) => {
	return context.page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		return Array.from(containers).map((container) => {
			return container.getAttribute('data-test-id')
		})
	})
}

exports.scrollToLatestConversationListItem = (context) => {
	return context.page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		containers[containers.length - 1].scrollIntoView()
	})
}

exports.createConversation = async (context) => {
	await context.page.type('[data-test="conversation-subject"]', 'Conversation subject')
	await context.page.type('.new-message-input', 'Conversation first message')
	await context.page.click('[data-test="start-conversation-button"]')
}

exports.createOrg = async (context) => {
	const uniqueId = uuid()
	return context.sdk.card.create({
		type: 'org',
		slug: `org-${uniqueId}`,
		name: `Org ${uniqueId}`,
		version: '1.0.0'
	})
}

exports.prepareUser = async (context, org, role, name) => {
	const details = {
		username: `${uuid()}`,
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}

	const card = await context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${details.username}`,
			email: details.email,
			password: details.password
		}
	})

	await context.sdk.card.update(
		card.id,
		card.type,
		[
			{
				op: 'add',
				path: '/data/roles/0',
				value: role
			},
			{
				op: 'add',
				path: '/data/profile',
				value: {
					name: (([ first, last ]) => {
						return {
							first,
							last
						}
					})(name.split(' '))
				}
			}
		]
	)

	await context.sdk.card.link(card, org, 'is member of')

	const sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})

	await sdk.auth.login(details)

	return {
		sdk,
		card,
		org
	}
}

exports.initChat = async (context) => {
	await context.page.evaluate(async (supportUserToken, supportUserSlug) => {
		window.localStorage.setItem('token', supportUserToken)

		await window.init({
			product: 'jellyfish',
			productTitle: 'Jelly',
			userSlug: supportUserSlug
		})
	}, context.supportUser.sdk.getAuthToken(), context.supportUser.card.slug)
}

exports.insertAgentReply = async (context, thread, message) => {
	return context.supportAgent.sdk.event.create({
		target: thread,
		type: 'message',
		slug: `message-${uuid()}`,
		tags: [],
		payload: {
			mentionsUser: [],
			alertsUser: [],
			mentionsGroup: [],
			alertsGroup: [],
			message
		}
	})
}
