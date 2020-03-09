/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const qs = require('query-string')
const environment = require('../../../lib/environment')
const {
	INITIAL_FETCH_CONVERSATIONS_LIMIT
} = require('../../../lib/chat-widget/constants')
const {
	createChatMessage
} = require('../ui/macros')
const helpers = require('./helpers')
const {
	createConversation,
	createThreads,
	getRenderedConversationIds,
	scrollToLatestConversationListItem
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
			}
		},
		additionalProperties: true
	})

	await Promise.all(threads.map((thread) => {
		return context.sdk.card.remove(thread.id, thread.type)
	}))
})

ava.serial.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Initial create conversation page', async (test) => {
	const {
		page
	} = context

	const queryString = qs.stringify({
		authToken: context.sdk.getAuthToken(),
		product: 'jellyfish',
		productTitle: 'Jelly'
	})

	await page.goto(`${environment.livechat.host}:${environment.livechat.port}?${queryString}`)

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

	const threads = await createThreads(context, 0, 2)

	await page.reload()

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-short-conversation-page"]'),
		'should be displayed initially when there is at least one conversation'
	)

	const conversationIds = await getRenderedConversationIds(context)

	test.true(
		threads.reverse().every((thread, index) => {
			return conversationIds[index] === thread.id
		}),
		'should display latest two conversations'
	)

	const selectedConversationId = conversationIds[conversationIds.length - 1]
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
		page.waitForSelector('[data-test="view-all-conversations-button"]'),
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
})

ava.serial('Full conversation list page', async (test) => {
	const {
		page
	} = context

	const threads = await createThreads(context, 0, INITIAL_FETCH_CONVERSATIONS_LIMIT + 1)

	await page.reload()

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
	const {
		page
	} = context

	await createThreads(context, 0, 1)

	await page.reload()

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
})

ava.serial('Chat page', async (test) => {
	const {
		page
	} = context

	const thread = (await createThreads(context, 0, 1))[0]

	await page.reload()

	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	await page.click(`[data-test-component="card-chat-summary"][data-test-id="${thread.id}"]`)

	await page.waitForSelector('[data-test="chat-page"]')

	await createChatMessage(page, '', 'First message')

	test.pass()
})
