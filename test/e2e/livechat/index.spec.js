/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const environment = require('../../../lib/environment')
const helpers = require('./helpers')
const {
	createThreads, getRenderedConversationIds
} = require('./macros')

const context = {
	context: {
		id: `LIVECHAT-INTEGRATION-TEST-${uuid()}`
	}
}

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})
})

ava.beforeEach(async () => {
	const threads = await context.sdk.query({
		properties: {
			type: {
				const: 'support-thread'
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

ava.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Initial create conversation page', async (test) => {
	const {
		page
	} = context

	await page.goto(`${environment.livechat.host}:${environment.livechat.port}`)

	await test.notThrowsAsync(
		page.waitForSelector('[data-test="initial-create-conversation-page"]'),
		'should be displayed when there are no conversations'
	)

	await page.type('[data-test="conversation-subject"]', 'Conversation subject')
	await page.type('.new-message-input', 'Conversation first message')
	await page.click('[data-test="start-conversation-button"]')

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

	await createThreads(context, 2, 3)

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

ava.skip('Full conversation list page', async (test) => {
	test.pass('should display conversations sorted by last update date (newest first)')
	test.pass('should load older conversations when scrolled down')
	test.pass('should navigate to respective chat page when clicked on the conversation')
	test.pass('should navigate back to full conversation list page when pressing back button')
	test.pass('should navigate to create conversation page when clicking "Start new conversation" button')
	test.pass('should navigate back to full conversation list page when pressing back button')
})

ava.skip('Create conversation page', async (test) => {
	test.pass('should create a conversation and navigate to it')
	test.pass('should navigate back to create conversation page when pressing back button')
})

ava.skip('Chat page', async (test) => {
	test.pass('should send message when pressing shift+enter')
	test.pass('should display sent message')
	test.pass('should display received message')
})
