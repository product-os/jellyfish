/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const qs = require('querystring')
const {
	v4: uuid
} = require('uuid')
const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('@balena/jellyfish-environment')

exports.createThreads = async (context, start, count) => {
	const threads = []
	const markers = [ `${context.supportUser.card.slug}+${context.supportAgent.org.slug}` ]

	for (let index = start; index < start + count; index++) {
		const thread = await context.supportUser.sdk.card.create({
			type: 'support-thread',
			name: `Thread subject ${index}`,
			markers,
			data: {
				product: 'balenaCloud',
				status: 'open',
				inbox: 'paid'
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

exports.prepareSupportUser = async (context) => {
	const authToken = await context.page.evaluate(async () => {
		return window.localStorage.getItem('token')
	})

	const sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`,
		authToken
	})

	const session = await context.sdk.card.get(authToken)
	const user = await context.sdk.card.get(session.data.actor)

	return {
		sdk,
		card: user
	}
}

exports.prepareOauthExample = async (context) => {
	const providerUniqueId = uuid()
	const provider = await context.sdk.card.create({
		type: 'oauth-provider',
		slug: `oauth-provider-example-${providerUniqueId}`,
		name: `Oauth provider example ${providerUniqueId}`,
		version: '1.0.0',
		data: {
			authorizeUrl: 'http://oauth-provider-example/oauth/authorize?client_id={{clientId}}',
			tokenUrl: 'http://oauth-provider-example/oauth/token',
			whoamiUrl: 'http://oauth-provider-example/whoami',
			whoamiFieldMap: {
				username: [ 'username' ],
				firstname: [ 'firstname' ],
				lastname: [ 'lastname' ]
			}
		}
	})

	const clientUniqueId = uuid()
	const client = await context.sdk.card.create({
		type: 'oauth-client',
		slug: `oauth-client-example-${clientUniqueId}`,
		name: `Oauth client example ${clientUniqueId}`,
		version: '1.0.0',
		data: {
			clientId: 'jellyfish',
			clientSecret: 'jellyfish client secret'
		}
	})

	console.info('Oauth client created:', client.slug)
	await context.sdk.card.link(provider, client, 'has attached')

	return {
		provider,
		client
	}
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

	if (org) {
		await context.sdk.card.link(card, org, 'is member of')
	}

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
	const queryString = qs.stringify({
		clientSlug: context.oauth.client.slug,
		username: 'test-user',
		product: 'balenaCloud',
		productTitle: 'Livechat test',
		inbox: 'paid'
	})

	await context.page.goto(
		`${environment.livechat.host}:${environment.livechat.port}?${queryString}`
	)
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
