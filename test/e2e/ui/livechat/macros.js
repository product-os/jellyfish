const {
	getSdk
} = require('@balena/jellyfish-client-sdk')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const {
	v4: uuid
} = require('uuid')
const qs = require('querystring')

exports.retry = async (times, functionToTry, delay = 0) => {
	try {
		const result = await functionToTry()
		return result
	} catch (error) {
		if (times) {
			if (delay > 0) {
				await new Promise((resolve) => {
					setTimeout(resolve, delay)
				})
			}
			return exports.retry(times - 1, functionToTry, delay)
		}

		throw error
	}
}

exports.createThreads = async (user, start, count) => {
	const threads = []
	const markers = [ `${user.card.slug}+org-balena` ]

	for (let index = start; index < start + count; index++) {
		const thread = await user.sdk.card.create({
			type: 'support-thread@1.0.0',
			name: `Thread subject ${index}`,
			markers,
			data: {
				product: 'balenaCloud',
				status: 'open'
			}
		})

		threads.push(thread)
	}

	return threads
}

exports.subscribeToThread = async (user, thread) => {
	const subscription = await user.sdk.card.create({
		type: 'subscription@1.0.0',
		slug: `subscription-${uuid()}`,
		data: {}
	})

	await user.sdk.card.link(thread, subscription, 'has attached')
}

exports.getRenderedConversationIds = async (page) => {
	return page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		return Array.from(containers).map((container) => {
			return container.getAttribute('data-test-id')
		})
	})
}

exports.scrollToLatestConversationListItem = (page) => {
	return page.evaluate(() => {
		const containers = document.querySelectorAll('[data-test-component="card-chat-summary"]')
		containers[containers.length - 1].scrollIntoView()
	})
}

exports.createConversation = async (page) => {
	await page.type('[data-test="conversation-subject"]', 'Conversation subject')
	await page.type('.new-message-input', 'Conversation first message')
	await page.click('[data-test="start-conversation-button"]')
}

exports.prepareUser = async (sdk, org, role, name) => {
	const credentials = {
		username: `${uuid()}`,
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}

	const card = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${credentials.username}`,
			email: credentials.email,
			password: credentials.password
		}
	})

	await sdk.card.update(
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
		await sdk.card.link(card, org, 'is member of')
	}

	const userSdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: `${environment.http.host}:${environment.http.port}`
	})

	await userSdk.auth.login(credentials)

	return {
		sdk: userSdk,
		card,
		org,
		credentials
	}
}

exports.initChat = async (page, user) => {
	const queryString = qs.stringify({
		loginAs: user.card.slug.replace('user-', ''),
		product: 'balenaCloud',
		productTitle: 'Livechat test',
		inbox: 'paid'
	})

	const url = `/livechat?${queryString}`
	await page.goto(url)
}

exports.navigateTo = async (page, to) => {
	await page.evaluate(async (payload) => {
		window.postMessage({
			type: 'navigate',
			payload
		})
	}, to)
}

exports.insertAgentReply = async (user, thread, message) => {
	return user.sdk.event.create({
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

exports.waitForNotifications = (page, notificationsLength) => {
	return exports.retry(60, async () => {
		const notifications = await page.evaluate(() => {
			return window.notifications
		})
		if (notifications && notifications.length === notificationsLength) {
			return notifications
		}
		throw new Error('No notifications found')
	}, 5000)
}
