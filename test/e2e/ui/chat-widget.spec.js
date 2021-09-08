/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const macros = require('./macros')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const userDetails1 = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const {
		page
	} = context

	await macros.goto(page, '/')
	const user1 = await context.createUser(userDetails1)
	await macros.loginUser(page, userDetails1)
	await context.addUserToBalenaOrg(user1.id)
	await page.reload()

	context.user1 = user1
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	await helpers.after({
		context
	})
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('A user can start a Jellyfish support thread from the chat widget', async (test) => {
	const {
		page
	} = context
	const jfThreadsViewSelector = '.column--view-all-jellyfish-support-threads'
	const jfThreadSelector = '.column--support-thread'
	const cwWrapper = '[data-test="chat-widget"]'
	const cwConvList = '[data-test="initial-short-conversation-page"]'

	const subject = `Subject ${uuid()}`
	const message = `Message ${uuid()}`
	const replyMessage = `Reply ${uuid()}`

	// Use the chat widget to start a new conversation
	await macros.waitForThenClickSelector(page, '[data-test="open-chat-widget"]')

	// Wait for the chat widget to open
	await macros.waitForThenClickSelector(page, '[data-test="chat-widget"]')

	// If there's existing threads we need to click on the 'Start new conversation' button first
	try {
		await macros.waitForThenClickSelector(page, '[data-test="start-new-conversation-button"]', {
			timeout: 10 * 1000
		})
	} catch (err) {
		// We are probably already in 'Create Thread mode' as there are no existing threads
	}

	await macros.setInputValue(page, `${cwWrapper} [data-test="conversation-subject"]`, subject)
	await macros.setInputValue(page, `${cwWrapper} textarea.new-message-input`, message)
	await macros.waitForThenClickSelector(page, `${cwWrapper} [data-test="start-conversation-button"]`)

	// Verify the conversation timeline is displayed in the chat widget
	const threadSelector = '[data-test="chat-page"]'
	const threadElement = await page.waitForSelector(threadSelector)
	const threadId = await macros.getElementAttribute(page, threadElement, 'data-test-id')
	const messageText = await macros.getElementText(page, `${threadSelector} [data-test="event-card__message"] p`)
	test.is(messageText.trim(), message)

	// Return to the conversation list...
	await macros.waitForThenClickSelector(page, '[data-test="navigate-back-button"]')

	// ...and verify the new conversation is also now listed in the conversation list in the chat widget
	let messageSnippet = await macros.getElementText(page,
		`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`)
	test.is(messageSnippet.trim(), message)

	// Now close the chat widget and navigate to the 'Jellyfish threads' support view
	await macros.waitForThenClickSelector(page, '[data-test="chat-widget"] [data-test="close-chat-widget"]')
	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-all-jellyfish-support-threads"]'
	])

	// And verify the new conversation appears in the list of support threads in this view.
	const threadSummarySelector = `${jfThreadsViewSelector} [data-test-id="${threadId}"]`
	const messageSnippetInThread = await macros.getElementText(page,
		`${threadSummarySelector} [data-test="card-chat-summary__message"] p`)
	test.is(messageSnippetInThread.trim(), message)

	// Now open the support thread view and reply
	await macros.waitForThenClickSelector(page, threadSummarySelector)
	await macros.waitForThenClickSelector(page, '[data-test="timeline__whisper-toggle"]')
	await Bluebird.delay(500)
	await macros.createChatMessage(page, jfThreadSelector, replyMessage)

	// And finally verify the reply shows up in the chat widget conversation summary
	await macros.waitForThenClickSelector(page, '[data-test="open-chat-widget"]')
	messageSnippet = await macros.waitForInnerText(
		page,
		`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
		replyMessage
	)
})
