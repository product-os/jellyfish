const {
	INITIAL_FETCH_CONVERSATIONS_LIMIT
} = require('@balena/jellyfish-chat-widget/build/constants')
const {
	test, expect
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const uiMacros = require('../ui/macros')
const macros = require('./macros')

let sdk = {}
let supportAgent = {}
let supportUser = {}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	const org = await sdk.card.get('org-balena')
	supportAgent = await macros.prepareUser(sdk, org, 'user-community', 'Support Agent')
	supportUser = await macros.prepareUser(sdk, null, 'user-external-support', 'Support User')
})

test.beforeEach(async ({
	page
}) => {
	await macros.setToken(page, supportUser)

	const threads = await sdk.query({
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
		return sdk.card.remove(thread.id, thread.type)
	}))
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test('Initial create conversation page', async ({
	page
}) => {
	await macros.initChat(page, supportUser)
	await page.waitForSelector('[data-test="initial-create-conversation-page"]')

	await macros.createConversation(page)
	await page.waitForSelector('[data-test="chat-page"]')
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')
})

test('Initial short conversation list page', async ({
	page
}) => {
	const threads1 = await macros.createThreads(supportUser, 0, 2)
	await macros.initChat(page, supportUser)

	//  Should be displayed initially when there is at least one conversation
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	// Should display latest two conversations
	const conversationIds1 = await macros.getRenderedConversationIds(page)
	expect(threads1.reverse().every((thread, index) => {
		return conversationIds1[index] === thread.id
	})).toBeTruthy()

	// Should navigate to respective chat page when clicked on the conversation
	const selectedConversationId = conversationIds1[conversationIds1.length - 1]
	await page.click(`[data-test-id="${selectedConversationId}"]`)
	await page.waitForSelector(`[data-test="chat-page"][data-test-id="${selectedConversationId}"]`)

	// Should navigate back to short conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	// Should navigate to create conversation page when clicking "Start new conversation" button
	await page.click('[data-test="start-new-conversation-button"]')
	await page.waitForSelector('[data-test="create-new-conversation-page"]')

	// Should navigate back to short conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	// Should not display "View all conversations" link when there are less then three conversations
	expect(await page.$('[data-test="view-all-conversations-button"]')).toBeNull()

	// Should display "View all conversations" link when there are more then two conversations
	await macros.createThreads(supportUser, 2, 1)
	await page.waitForSelector('[data-test="view-all-conversations-button"]', {
		timeout: 60 * 1000
	})

	// Should navigate to full conversation list page when pressing "View all conversations" link
	await page.click('[data-test="view-all-conversations-button"]')
	await page.waitForSelector('[data-test="full-conversation-list-page"]')

	// Should navigate back to short conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	// Test Full conversation list page
	const threads = await macros.createThreads(supportUser, 0, INITIAL_FETCH_CONVERSATIONS_LIMIT + 1)
	await macros.initChat(page, supportUser)

	// Should be displayed initially when there is at least one conversation
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')
	await page.click('[data-test="view-all-conversations-button"]')

	// Should navigate to full conversation list page when pressing "View all conversations" link
	await page.waitForSelector('[data-test="full-conversation-list-page"]')

	// Should display latest ${INITIAL_FETCH_CONVERSATIONS_LIMIT} conversations
	const conversationIds = await macros.getRenderedConversationIds(page)
	expect(conversationIds).toEqual(threads
		.reverse()
		.slice(0, INITIAL_FETCH_CONVERSATIONS_LIMIT)
		.map((thread) => {
			return thread.id
		}))

	// Should load older conversations when scrolled down
	await macros.scrollToLatestConversationListItem(page)
	await page.waitForSelector(`[data-test-component="card-chat-summary"][data-test-id="${threads[0].id}"]`)

	// Should display dynamically created conversation
	const dynamicallyCreatedThread = (await macros.createThreads(supportUser, INITIAL_FETCH_CONVERSATIONS_LIMIT + 1, 1))[0]
	await page.waitForSelector(`[data-test-component="card-chat-summary"][data-test-id="${dynamicallyCreatedThread.id}"]`)

	// Should navigate to respective chat page when clicked on the conversation
	await page.click(`[data-test-component="card-chat-summary"][data-test-id="${dynamicallyCreatedThread.id}"]`)
	await page.waitForSelector(`[data-test="chat-page"][data-test-id="${dynamicallyCreatedThread.id}"]`)

	// Should navigate back to full conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="full-conversation-list-page"]')

	// Should navigate to create conversation page when clicking "Start new conversation" button
	await page.click('[data-test="start-new-conversation-button"]')
	await page.waitForSelector('[data-test="create-new-conversation-page"]')

	// Should navigate back to full conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="full-conversation-list-page"]')
})

test('Create conversation page', async ({
	page
}) => {
	await macros.createThreads(supportUser, 0, 1)

	// Should navigate to created conversation chat page
	await macros.initChat(page, supportUser)
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')
	await page.click('[data-test="start-new-conversation-button"]')
	await page.waitForSelector('[data-test="create-new-conversation-page"]')
	await macros.createConversation(page)
	await page.waitForSelector('[data-test="chat-page"]')

	// Should navigate back to short conversation list page when pressing back button
	await page.click('[data-test="navigate-back-button"]')
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')

	// Test Chat page
	const thread = (await macros.createThreads(supportUser, 0, 1))[0]
	await macros.subscribeToThread(supportUser, thread)
	await macros.initChat(page, supportUser)
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')
	await page.click(`[data-test-component="card-chat-summary"][data-test-id="${thread.id}"]`)
	await page.waitForSelector('[data-test="chat-page"]')
	await uiMacros.createChatMessage(page, '', 'Message from user')

	// Should display support user's username
	await uiMacros.waitForInnerText(page, '[data-test="event__actor-label"]', supportUser.card.slug.replace(/^user-/, ''))

	await page.evaluate(() => {
		window.addEventListener('message', (event) => {
			if (
				event.data.type === 'notifications-change' &&
				event.data.payload.data &&
				event.data.payload.data.length > 0
			) {
				window.notifications = event.data.payload.data
			}
		})
	})
	const response = await macros.insertAgentReply(supportAgent, thread, 'Response from agent')

	// Should receive notification
	const [ notification ] = await macros.waitForNotifications(page, 1)
	expect(notification.links['is attached to'][0].id).toEqual(response.id)

	// Should display support agent's username
	await uiMacros.waitForInnerText(page, '[data-test="event__actor-label"]', supportAgent.card.slug.replace(/^user-/, ''), 1)

	// External navigation request
	await macros.initChat(page, supportUser)

	// Should be displayed initially when there is at least one conversation
	await page.waitForSelector('[data-test="initial-short-conversation-page"]')
	await macros.navigateTo(page, `/chat/${thread.id}`)

	// Should navigate to thread
	await page.waitForSelector(`[data-test="chat-page"][data-test-id="${thread.id}"]`)
})
