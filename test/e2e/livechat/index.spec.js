/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const environment = require('../../../lib/environment')
const helpers = require('./helpers')

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

ava.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava('Initial create conversation page', async (test) => {
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

ava.skip('Initial short conversation list page', async (test) => {
	test.pass('should be displayed initially when there is at least one conversation')
	test.pass('should display latest two conversations')
	test.pass('should navigate to respective chat page when clicked on the conversation')
	test.pass('should navigate back to short conversation list page when pressing back button')
	test.pass('should navigate to create conversation page when clicking "Start new conversation" button')
	test.pass('should navigate back to short conversation list page when pressing back button')
	test.pass('should not display "See all conversations" link when there are less then three conversations')
	test.pass('should display "See all conversations" link when there are more then two conversations')
	test.pass('should navigate to full conversation list page when pressing "See all conversations" link')
	test.pass('should navigate back to short conversation list page when pressing back button')
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
