/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const {
	INITIAL_FETCH_CONVERSATIONS_LIMIT
} = require('@balena/jellyfish-chat-widget/build/constants')
const {
	createChatMessage,
	waitForInnerText
} = require('../ui/macros')
const helpers = require('./helpers')
const {
	createConversation,
	createThreads,
	subscribeToThread,
	waitForNotifications,
	getRenderedConversationIds,
	initChat,
	setToken,
	insertAgentReply,
	prepareUser,
	scrollToLatestConversationListItem,
	navigateTo
} = require('./macros')

const context = {
	context: {
		id: `LIVECHAT-INTEGRATION-TEST-${uuid()}`
	}
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const org = await context.sdk.card.get('org-balena')
	context.supportAgent = await prepareUser(context, org, 'user-community', 'Support Agent')
	context.supportUser = await prepareUser(context, null, 'user-external-support', 'Support User')

	await setToken(context)
})

ava.serial.beforeEach(async () => {
	const threads = await context.sdk.query({
		properties: {
			type: {
				type: 'string',
				const: 'support-thread@1.0.0'
			},
			active: {
				const: true
			},
			data: {
				type: 'object',
				required: [ 'product' ],
				properties: {
					product: {
						// This is a heuristic for finding just the threads created via livechat,
						// so that we don't accidentally delete other test data (e.g. sync tests)
						type: 'string',
						const: 'balenaCloud'
					}
				}
			}
		},
		additionalProperties: true
	})

	await Promise.all(threads.map((thread) => {
		return context.sdk.card.remove(thread.id, thread.type)
	}))
})

ava.serial.after.always(async () => {
	await helpers.after({
		context
	})
	await helpers.browser.afterEach({
		context
	})
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial('Initial create conversation page', async (test) => {
	const {
		page
	} = context

	await initChat(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-create-conversation-page"]'),
		'should be displayed when there are no conversations'
	)

	await createConversation(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="chat-page"]'),
		'should navigate to created conversation chat page'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should navigate to initial short conversation list page when pressing back button'
	)
})

ava.serial('Initial short conversation list page', async (test) => {
	const {
		page
	} = context

	const threads1 = await createThreads(context, 0, 2)
	await initChat(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should be displayed initially when there is at least one conversation'
	)

	const conversationIds1 = await getRenderedConversationIds(context)

	test.true(
		threads1.reverse().every((thread, index) => {
			return conversationIds1[index] === thread.id
		}),
		'should display latest two conversations'
	)

	const selectedConversationId = conversationIds1[conversationIds1.length - 1]
	await page.click(`[data-test-id="${selectedConversationId}"]`)

	await test.notThrowsAsync(
		page.waitForSelector(`[data-test="chat-page"][data-test-id="${selectedConversationId}"]`),
		'should navigate to respective chat page when clicked on the conversation'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should navigate back to short conversation list page when pressing back button'
	)

	await page.click('[data-test="start-new-conversation-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="create-new-conversation-page"]'),
		'should navigate to create conversation page when clicking "Start new conversation" button'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should navigate back to short conversation list page when pressing back button'
	)

	test.is(
		await page.$('[data-test="view-all-conversations-button"]'),
		null,
		'should not display "View all conversations" link when there are less then three conversations'
	)

	await createThreads(context, 2, 1)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="view-all-conversations-button"]', {
			timeout: 60 * 1000
		}),
		'should display "View all conversations" link when there are more then two conversations'
	)

	await page.click('[data-test="view-all-conversations-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="full-conversation-list-page"]'),
		'should navigate to full conversation list page when pressing "View all conversations" link'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should navigate back to short conversation list page when pressing back button'
	)

	// Test Full conversation list page
	const threads = await createThreads(context, 0, INITIAL_FETCH_CONVERSATIONS_LIMIT + 1)
	await initChat(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should be displayed initially when there is at least one conversation'
	)

	await page.click('[data-test="view-all-conversations-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="full-conversation-list-page"]'),
		'should navigate to full conversation list page when pressing "View all conversations" link'
	)

	const conversationIds = await getRenderedConversationIds(context)

	test.deepEqual(
		conversationIds,
		threads
			.reverse()
			.slice(0, INITIAL_FETCH_CONVERSATIONS_LIMIT)
			.map((thread) => {
				return thread.id
			}),
		`should display latest ${INITIAL_FETCH_CONVERSATIONS_LIMIT} conversations`
	)

	await scrollToLatestConversationListItem(context)

	await test.notThrowsAsync(
		page.waitForSelector(`[data-test-component="card-chat-summary"][data-test-id="${threads[0].id}"]`),
		'should load older conversations when scrolled down'
	)

	const dynamicallyCreatedThread = (await createThreads(context, INITIAL_FETCH_CONVERSATIONS_LIMIT + 1, 1))[0]

	await test.notThrowsAsync(
		page.waitForSelector(`[data-test-component="card-chat-summary"][data-test-id="${dynamicallyCreatedThread.id}"]`),
		'should display dynamically created conversation'
	)

	await page.click(`[data-test-component="card-chat-summary"][data-test-id="${dynamicallyCreatedThread.id}"]`)

	await test.notThrowsAsync(
		page.waitForSelector(`[data-test="chat-page"][data-test-id="${dynamicallyCreatedThread.id}"]`),
		'should navigate to respective chat page when clicked on the conversation'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="full-conversation-list-page"]'),
		'should navigate back to full conversation list page when pressing back button'
	)

	await page.click('[data-test="start-new-conversation-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="create-new-conversation-page"]'),
		'should navigate to create conversation page when clicking "Start new conversation" button'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="full-conversation-list-page"]'),
		'should navigate back to full conversation list page when pressing back button'
	)
})

ava.serial('Create conversation page', async (test) => {
	test.timeout(20 * 60 * 1000)

	const {
		page
	} = context

	await createThreads(context, 0, 1)
	await initChat(context)

	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	await page.click('[data-test="start-new-conversation-button"]')

	await page.waitForSelector('[data-test="create-new-conversation-page"]')

	await createConversation(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="chat-page"]'),
		'should navigate to created conversation chat page'
	)

	await page.click('[data-test="navigate-back-button"]')

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should navigate back to short conversation list page when pressing back button'
	)

	console.log('##################### STAGE 1 #####################')

	// Test Chat page
	const thread = (await createThreads(context, 0, 1))[0]
	await subscribeToThread(context, thread)

	await initChat(context)

	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	await page.click(`[data-test-component="card-chat-summary"][data-test-id="${thread.id}"]`)

	await page.waitForSelector('[data-test="chat-page"]')

	console.log('##################### STAGE 2 #####################')

	await createChatMessage(page, '', 'Message from user')

	console.log('##################### STAGE 3 #####################')

	await test.notThrowsAsync(
		waitForInnerText(
			page,
			'[data-test="event__actor-label"]',
			context.supportUser.card.slug.replace(/^user-/, '')
		),
		'should display support user\'s username'
	)

	console.log('##################### STAGE 4 #####################')

	await context.page.evaluate(() => {
		window.addEventListener('message', (event) => {
			console.log('@@@@@@@@@@@@ got event! @@@@@@@@@@@')
			console.log(JSON.stringify(event, null, 2))
			if (event.data.type === 'notifications-change') {
				window.notifications = event.data.payload.data
			}
		})
	})

	console.log('##################### STAGE 5 #####################')

	const response = await insertAgentReply(context, thread, 'Response from agent')

	console.log('##################### STAGE 6 #####################')

	const [ notification ] = await waitForNotifications(context, 1)

	console.log('##################### STAGE 7 #####################')

	test.is(
		notification.links['is attached to'][0].id,
		response.id,
		'should receive notification'
	)

	console.log('##################### STAGE 8 #####################')

	await test.notThrowsAsync(
		waitForInnerText(
			page,
			'[data-test="event__actor-label"]',
			context.supportAgent.card.slug.replace(/^user-/, ''),
			1
		),
		'should display support agent\'s username'
	)

	console.log('##################### STAGE 9 #####################')

	// External navigation request
	await initChat(context)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should be displayed initially when there is at least one conversation'
	)

	console.log('##################### STAGE 10 #####################')

	await navigateTo(context, `/chat/${thread.id}`)

	console.log('##################### STAGE 11 #####################')

	await page.waitForSelector(`[data-test="chat-page"][data-test-id="${thread.id}"]`)
	test.pass('should navigate to thread')
})
