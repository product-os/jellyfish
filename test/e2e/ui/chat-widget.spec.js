const {
	test, expect
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

let sdk = {}
let user = {}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

const login = async (page, details) => {
	await page.goto('/')
	await page.type('.login-page__input--username', details.username)
	await page.type('.login-page__input--password', details.password)
	await page.click('.login-page__submit--login')
	await page.waitForSelector('.home-channel')
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await helpers.createUser(sdk, users.community)
	await helpers.addUserToBalenaOrg(sdk, user.id)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})
test.describe('Chat Widget', () => {
	test('A user can start a Jellyfish support thread from the chat widget', async ({
		page
	}) => {
		await login(page, users.community)

		const jfThreadsViewSelector = '.column--view-all-jellyfish-support-threads'
		const jfThreadSelector = '.column--support-thread'
		const cwWrapper = '[data-test="chat-widget"]'
		const cwConvList = '[data-test="initial-short-conversation-page"]'

		const subject = `Subject ${uuid()}`
		const message = `Message ${uuid()}`
		const replyMessage = `Reply ${uuid()}`

		// Use the chat widget to start a new conversation
		await page.locator('[data-test="open-chat-widget"]').click()

		// Wait for the chat widget to open
		await page
			.locator(
				'[data-test="start-new-conversation-button"], [data-test="start-conversation-button"]'
			)
			.click()
		await macros.setInputValue(
			page,
			`${cwWrapper} [data-test="conversation-subject"]`,
			subject
		)
		await macros.setInputValue(
			page,
			`${cwWrapper} textarea.new-message-input`,
			message
		)
		await page
			.locator(`${cwWrapper} [data-test="start-conversation-button"]`)
			.click()

		// Verify the conversation timeline is displayed in the chat widget
		const threadSelector = '[data-test="chat-page"]'
		const threadElement = await page.waitForSelector(threadSelector)
		const threadId = await macros.getElementAttribute(
			page,
			threadElement,
			'data-test-id'
		)
		const messageText = await macros.getElementText(
			page,
			`${threadSelector} [data-test="event-card__message"] p`
		)
		expect(messageText.trim(), message)

		// Return to the conversation list...
		await page.locator('[data-test="navigate-back-button"]').click()

		// ...and verify the new conversation is also now listed in the conversation list in the chat widget
		const messageSnippet = await macros.getElementText(
			page,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`
		)
		expect(messageSnippet.trim(), message)

		// Now close the chat widget and navigate to the 'Jellyfish threads' support view
		await page
			.locator('[data-test="chat-widget"] [data-test="close-chat-widget"]')
			.click()
		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-all-jellyfish-support-threads"]'
		])

		// And verify the new conversation appears in the list of support threads in this view.
		const threadSummarySelector = `${jfThreadsViewSelector} [data-test-id="${threadId}"]`
		const messageSnippetInThread = await macros.getElementText(
			page,
			`${threadSummarySelector} [data-test="card-chat-summary__message"] p`
		)
		expect(messageSnippetInThread.trim(), message)

		// Now open the support thread view and reply
		await page.locator(threadSummarySelector).click()
		await page.locator('[data-test="timeline-tab"]').click()
		await page.locator('[data-test="timeline__whisper-toggle"]').click()

		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await macros.createChatMessage(page, jfThreadSelector, replyMessage)

		// And finally verify the reply shows up in the chat widget conversation summary
		await page.locator('[data-test="open-chat-widget"]').click()
		await macros.waitForInnerText(
			page,
			`${cwConvList} [data-test-id="${threadId}"] [data-test="card-chat-summary__message"] p`,
			replyMessage
		)
	})
})
