const {
	test, expect
} = require('@playwright/test')
const assert = require('assert').strict
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

let sdk = {}
let user = {}
let user2 = {}

const selectors = {
	chat: {
		message: '[data-test="event-card__message"]',
		search: '.inbox__search input',
		markAsReadButton: '[data-test="inbox__mark-all-as-read"]'
	},
	repo: {
		searchBox: '[data-test="repository__search"] input'
	}
}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${uuid()}`,
		email: `janedoe-${uuid()}@example.com`,
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
	user2 = await helpers.createUser(sdk, users.community2)
	await helpers.addUserToBalenaOrg(sdk, user2.id)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})
test.describe('Chat', () => {
	test('A notice should be displayed when another user is typing', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the thread page
		await Promise.all([
			page.goto(`/${thread.id}`),
			page2.goto(`/${thread.id}`)
		])

		await page.locator('[data-test="timeline-tab"]').click()
		await page2.locator('[data-test="timeline-tab"]').click()
		await page.type('textarea', uuid())
		const messageText = await page2
			.locator('data-test=typing-notice')
			.textContent()
		expect(messageText).toEqual(`${users.community.username} is typing...`)

		await page2.close()
	})

	test('Messages typed but not sent should be preserved when navigating away', async ({
		page
	}) => {
		await login(page, users.community)

		const [ thread1, thread2 ] = await Promise.all([
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0'
				})
			}),
			page.evaluate(() => {
				return window.sdk.card.create({
					type: 'thread@1.0.0'
				})
			})
		])

		// Navigate to the thread page
		await page.goto(`/${thread1.id}`)
		await page.waitForSelector(`.column--slug-${thread1.slug}`)
		await page.locator('[data-test="timeline-tab"]').click()

		const rand = uuid()

		await page.waitForSelector('.new-message-input')
		await page.type('textarea', rand)

		// The delay here isn't ideal, but it helps mitigate issues that can occur due
		// to the message preservation being debounced in the UI
		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		await page.goto(`/${thread2.id}`)
		await page.waitForSelector(`.column--slug-${thread2.slug}`)

		await page.goto(`/${thread1.id}`)
		await page.waitForSelector(`.column--slug-${thread1.slug}`)

		const messageText = await macros.getElementText(page, 'textarea')
		expect(messageText).toEqual(rand)
	})

	test('Messages that mention a user should appear in their inbox', async ({
		page,
		browser
	}) => {
		const newContext = await browser.newContext()
		const page2 = await newContext.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.waitForSelector('.new-message-input')
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]'
		)
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Messages that alert a user should appear in their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `!${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]'
		)
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Messages that mention a users group should appear in their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name
			})
		}, groupName)
		await page.evaluate(
			(options) => {
				return window.sdk.card.link(
					options.group,
					options.user,
					'has group member'
				)
			},
			{
				group,
				user: user2
			}
		)

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `@@${groupName} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		await macros.waitForInnerText(
			page2,
			'[data-test="event-card__message"]',
			msg
		)

		await page2.close()
	})

	test('Messages that alert a users group should appear in their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Create a group and add the user to it
		const groupName = `group-${uuid()}`
		const group = await page.evaluate((name) => {
			return window.sdk.card.create({
				type: 'group@1.0.0',
				name
			})
		}, groupName)

		await page.evaluate(
			(options) => {
				return window.sdk.card.link(
					options.group,
					options.user,
					'has group member'
				)
			},
			{
				group,
				user: user2
			}
		)
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `!!${groupName} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]'
		)
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('One-to-one messages to a user should appear in their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(
			(options) => {
				return window.sdk.card.create({
					type: 'thread@1.0.0',
					markers: [ `${options.user1.slug}+${options.user2.slug}` ]
				})
			},
			{
				user1: user,
				user2
			}
		)
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `1-to-1 ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]'
		)
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Only messages that ping a user, their groups, or their 1-to-1 conversations should appear in their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const userGroups = await page.evaluate((usr) => {
			return window.sdk.query({
				type: 'object',
				required: [ 'type', 'name' ],
				$$links: {
					'has group member': {
						type: 'object',
						required: [ 'slug' ],
						properties: {
							slug: {
								const: usr.slug
							}
						},
						additionalProperties: false
					}
				},
				properties: {
					type: {
						const: 'group@1.0.0'
					}
				}
			})
		}, user2)

		const userGroupNames = _.map(userGroups, 'name')

		// Do things with the SDK to trigger the "status messages"
		// like getting refresh tokens
		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		await page.evaluate(() => {
			return window.sdk.auth.refreshToken()
		})

		// Making a thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Then we send 2 tagged messages to the user
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)
		await macros.createChatMessage(page, columnSelector, msg)

		// And send a message to our own group
		await page2.goto(`/${thread.id}`)
		await page2.waitForSelector(columnSelector)
		await page2.locator('[data-test="timeline-tab"]').click()
		const ownGroupMsg = `@@${userGroupNames[0]} ${uuid()}`
		await page2.waitForSelector('.new-message-input')
		await macros.createChatMessage(page2, columnSelector, ownGroupMsg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		await new Promise((resolve) => {
			setTimeout(resolve, 1000)
		})

		// Get all children of the messageList-ListWrapper
		// These should be all messages
		const children = await page2.$$('[data-test="messageList-event"]')

		// Loop throught all the children to get the labels
		const messagesWithUser = []
		for (const child of children) {
			// Get the labels
			const text = await page2.evaluate((ele) => {
				return ele.textContent
			}, child)

			const eventId = (
				await macros.getElementAttribute(page2, child, 'id')
			).replace(/^event-/, '')
			if (eventId === ownGroupMsg.id) {
				test.fail('Message to own group found in inbox')
			}

			const mentionsGroup = (groupName) => {
				return text.includes(groupName)
			}

			// Check if labels include the @user2
			if (
				text.includes(user2.slug.slice(5)) ||
				_.some(userGroupNames, mentionsGroup)
			) {
				// Push all texts to an array
				messagesWithUser.push(true)
			} else {
				// Check if it is a 1-to-1 message that includes user2
				const event = await page2.evaluate((id) => {
					return window.sdk.card.get(id)
				}, eventId)
				const userInMarkerRegExp = new RegExp(`(\\+|^)${user2.slug}(\\+|$)`)
				if (_.some(_.invokeMap(event.markers, 'match', userInMarkerRegExp))) {
					messagesWithUser.push(true)
				} else {
					messagesWithUser.push(false)
				}
			}
		}

		// Check if array is expected length
		expect(
			messagesWithUser.every((currentValue) => {
				return currentValue === true
			})
		).toBeTruthy()

		await page2.close()
	})

	test.skip('When having two chats side-by-side both should update with new messages', async ({
		page
	}) => {
		await login(page, users.community)

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		await page.goto(`/${thread.id}/${thread.id}`)
		const columnSelector = `.column--slug-${thread.slug}`
		await page.waitForSelector(columnSelector)
		await page.locator('{$columnSelector} [data-test="timeline-tab"]').click()
		await page.waitForSelector('.new-message-input')
		const msg = `@${user.slug.slice(5)} ${uuid()}`
		await macros.createChatMessage(page, columnSelector, msg)

		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		const messagesOnPages = await page.$$('.event-card--message')
		expect(messagesOnPages.length).toEqual(2)
	})

	// TODO re-enable this test once
	// https://github.com/product-os/jellyfish/issues/3703 is resolved
	test.skip('Username pings should be case insensitive', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `@${user2.slug.slice(5).toUpperCase()} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		// Navigate to the inbox page
		await page2.goto('/inbox')
		const messageText = await macros.getElementText(
			page2,
			'[data-test="event-card__message"]'
		)
		expect(messageText.trim()).toEqual(msg)

		await page2.close()
	})

	test('Users should be able to mark all messages as read from their inbox', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})
		const columnSelector = `.column--slug-${thread.slug}`

		// Navigate to the thread page
		await page.goto(`/${thread.id}`)
		await page.waitForSelector(columnSelector)
		await page.locator('[data-test="timeline-tab"]').click()
		const msg = `@${user2.slug.slice(5)} ${uuid()}`
		await page.waitForSelector('.new-message-input')
		await macros.createChatMessage(page, columnSelector, msg)

		await page2.goto('/inbox')
		await page2.waitForSelector(selectors.chat.message)
		await page2.locator(selectors.chat.markAsReadButton).click()
		await macros.waitForSelectorToDisappear(page2, selectors.chat.message)

		await page2.close()
	})

	test('When filtering unread messages, only filtered messages can be marked as read', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()
		const page2 = await context.newPage()
		await Promise.all([
			login(page, users.community),
			login(page2, users.community2)
		])

		// Start by marking all messages as read
		await page2.goto('/inbox')
		await page2.locator(selectors.chat.markAsReadButton).click()

		// Create three new messages
		const messageDetails = _.range(3).map(() => {
			return {
				mentionsUser: [ user2.slug ],
				slug: `message-${uuid()}`,
				payload: `@${user2.slug.slice(5)} ${uuid()}`
			}
		})

		const messages = await page.evaluate(async (msgs) => {
			const thread = await window.sdk.card.create({
				type: 'thread@1.0.0'
			})
			return Promise.all(
				msgs.map((msg) => {
					return window.sdk.event.create({
						target: thread,
						slug: msg.slug,
						tags: [],
						type: 'message',
						payload: {
							mentionsUser: msg.mentionsUser,
							message: msg.payload
						}
					})
				})
			)
		}, messageDetails)

		// Navigate to the inbox page and reload
		await page2.goto('/inbox')

		// All three messages should appear in the inbox
		await page2.waitForSelector(selectors.chat.message)
		let messageElements = await page2.$$(selectors.chat.message)
		expect(messageElements.length).toEqual(3)
		let markAsReadButtonText = await macros.getElementText(
			page2,
			selectors.chat.markAsReadButton
		)
		expect(markAsReadButtonText).toEqual('Mark 3 as read')

		// Now search for the 2nd message
		await macros.setInputValue(
			page2,
			selectors.chat.search,
			messageDetails[1].payload
		)

		// Verify only the 2nd message is left in the inbox
		await macros.retry(
			10,
			async () => {
				messageElements = await page2.$$(selectors.chat.message)
				assert(messageElements.length === 1)
			},
			2000
		)
		await page2.waitForSelector(`[id=event-${messages[1].id}]`)
		markAsReadButtonText = await macros.getElementText(
			page2,
			selectors.chat.markAsReadButton
		)
		expect(markAsReadButtonText).toEqual('Mark 1 as read')

		// Mark just the filtered message as read
		await page2.locator(selectors.chat.markAsReadButton).click()

		// The filtered message should disappear from the unread inbox
		await page2.locator(`[id=event-${messages[1].id}]`).click()

		// Reload the page
		await page2.goto('/inbox')

		// And wait for the other two messages to re-appear (still unread)
		await page2.waitForSelector(`[id="event-${messages[0].id}"]`)
		await page2.waitForSelector(`[id="event-${messages[2].id}"]`)

		await page2.close()
	})
})
