/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const macros = require('./macros')
const environment = require('@balena/jellyfish-environment')

const messageSelector = '[data-test="event-card__message"]'
const searchSelector = '.inbox__search input'
const markAsReadButtonSelector = '[data-test="inbox__mark-all-as-read"]'

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

const userDetails2 = {
	username: `janedoe-${uuid()}`,
	email: `janedoe-${uuid()}@example.com`,
	password: 'password'
}

const markAllAsRead = async (test, page) => {
	await macros.waitForThenClickSelector(page, markAsReadButtonSelector)

	await macros.waitForSelectorToDisappear(page, messageSelector)

	const messages = await page.$$(messageSelector)

	// Assert that there are no longer messages in the inbox
	test.is(messages.length, 0)
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const {
		page,
		browser
	} = context

	await page.goto(`${environment.ui.host}:${environment.ui.port}`)
	const user1 = await context.createUser(userDetails1)
	await macros.loginUser(page, userDetails1)
	await context.addUserToBalenaOrg(user1.id)
	await page.reload()

	const incognitoContext = await browser.createIncognitoBrowserContext()
	const incognitoPage = await incognitoContext.newPage()
	incognitoPage.setViewport({
		width: 1366,
		height: 768
	})

	incognitoPage.on('pageerror', function (err) {
		const theTempValue = err.toString()
		console.log(`Page error: ${theTempValue}`)
		console.log(err)
	})

	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}`)
	const user2 = await context.createUser(userDetails2)
	await macros.loginUser(incognitoPage, userDetails2)
	await context.addUserToBalenaOrg(user2.id)
	await incognitoPage.reload()

	context.user1 = user1
	context.user2 = user2

	context.incognitoPage = incognitoPage
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

ava.serial('A notice should be displayed when another user is typing', async (test) => {
	const {
		incognitoPage,
		page
	} = context

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector('.column--thread')
	await incognitoPage.waitForSelector('.column--thread')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="typing-notice"]')

	test.is(messageText, `${userDetails1.username} is typing...`)

	test.pass()
})

ava.serial('Messages typed but not sent should be preserved when navigating away', async (test) => {
	const {
		page
	} = context

	const thread1 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	const thread2 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)

	// The delay here isn't ideal, but it helps mitigate issues that can occur due
	// to the message preservation being debounced in the UI
	await Bluebird.delay(5000)

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread2.id}`)
	await page.waitForSelector(`.column--slug-${thread2.slug}`)

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const messageText = await macros.getElementText(page, 'textarea')

	test.is(messageText, rand)

	test.pass()
})

ava.serial('Messages that mention a user should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Messages that alert a user should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `!${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Messages that alert a user should appear in their inbox and in the homechannel mentions count', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')
	await macros.createChatMessage(page, columnSelector, msg)
	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	await incognitoPage.waitForSelector('[data-test="event-card__message"]')
	const inboxmessages = await incognitoPage.$$('[data-test="event-card__message"]')

	await incognitoPage.waitForSelector('[data-test="homechannel-mentions-count"]')
	const mentionscount = await macros.getElementText(incognitoPage, '[data-test="homechannel-mentions-count"]')

	// Assert that they are equal count
	test.deepEqual(Number(mentionscount), inboxmessages.length)
})

ava.serial('Messages that mention a user\'s group should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

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

	await page.evaluate((grp, usr) => {
		return window.sdk.card.link(grp, usr, 'has group member')
	}, group, user2)

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@@${groupName} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Messages that alert a user\'s group should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

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

	await page.evaluate((grp, usr) => {
		return window.sdk.card.link(grp, usr, 'has group member')
	}, group, user2)

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `!!${groupName} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('One-to-one messages to a user should appear in their inbox', async (test) => {
	const {
		user1,
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate((u1, u2) => {
		return window.sdk.card.create({
			type: 'thread@1.0.0',
			markers: [ `${u1.slug}+${u2.slug}` ]
		})
	}, user1, user2)

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `1-to-1 ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial(
	'Only messages that ping a user or one of their groups or their 1-to-1 conversations should appear in their inbox',
	async (test) => {
		const {
			user2,
			page,
			incognitoPage
		} = context

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

		// Then we send 2 tagged messages to the user
		await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

		const columnSelector = `.column--slug-${thread.slug}`
		await page.waitForSelector(columnSelector)

		const msg = `@${user2.slug.slice(5)} ${uuid()}`

		await page.waitForSelector('.new-message-input')

		await macros.createChatMessage(page, columnSelector, msg)

		await macros.createChatMessage(page, columnSelector, msg)

		// And send a message to our own group
		await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

		await incognitoPage.waitForSelector(columnSelector)

		const ownGroupMsg = `@@${userGroupNames[0]} ${uuid()}`

		await incognitoPage.waitForSelector('.new-message-input')

		await macros.createChatMessage(incognitoPage, columnSelector, ownGroupMsg)

		// Navigate to the inbox page
		await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

		await Bluebird.delay(10000)

		// Get all children of the messageList-ListWrapper
		// These should be all messages
		const children = await incognitoPage.$$('[data-test="messageList-event"]')

		const messagesWithUser = []

		// Loop throught all the children to get the labels
		for (const child of children) {
			// Get the labels
			const text = await incognitoPage.evaluate((ele) => {
				return ele.textContent
			}, child)

			const eventId = (await macros.getElementAttribute(incognitoPage, child, 'id')).replace(/^event-/, '')
			console.log('eventId', eventId)
			if (eventId === ownGroupMsg.id) {
				test.fail('Message to own group found in inbox')
			}

			const mentionsGroup = (groupName) => {
				return text.includes(groupName)
			}

			// Check if labels include the @user2
			if (text.includes(user2.slug.slice(5)) || _.some(userGroupNames, mentionsGroup)) {
				// Push all texts to an array
				messagesWithUser.push(true)
			} else {
				// Check if it is a 1-to-1 message that includes user2
				const event = await incognitoPage.evaluate((id) => {
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

		// Check if array is Expected length
		test.is(messagesWithUser.every((currentValue) => {
			return currentValue === true
		}), true)

		test.pass()
	})

ava.serial.skip('When having two chats side-by-side both should update with new messages', async (test) => {
	const {
		user1,
		page
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	await page.waitForSelector('.new-message-input')

	const msg = `@${user1.slug.slice(5)} ${uuid()}`
	await macros.createChatMessage(page, columnSelector, msg)

	await Bluebird.delay(5000)

	const messagesOnPages = await page.$$('.event-card--message')

	test.is(messagesOnPages.length === 2, true)

	test.pass()
})

// TODO re-enable this test once
// https://github.com/product-os/jellyfish/issues/3703 is resolved
ava.skip('Username pings should be case insensitive', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5).toUpperCase()} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	const messageText = await macros.getElementText(incognitoPage, '[data-test="event-card__message"]')

	test.is(messageText.trim(), msg)

	test.pass()
})

ava.serial('Users should be able to mark all messages as read from their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the thread page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)
	await incognitoPage.waitForSelector(messageSelector)
	await markAllAsRead(test, incognitoPage)
})

ava.serial('When filtering unread messages, only filtered messages can be marked as read', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	// Start by marking all messages as read
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)
	await markAllAsRead(test, incognitoPage)

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
		return Promise.all(msgs.map((msg) => {
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
		}))
	}, messageDetails)

	// Navigate to the inbox page and reload
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	// All three messages should appear in the inbox
	await incognitoPage.waitForSelector(messageSelector)
	let messageElements = await incognitoPage.$$(messageSelector)
	test.is(messageElements.length, 3)
	let markAsReadButtonText = await macros.getElementText(incognitoPage, markAsReadButtonSelector)
	test.is(markAsReadButtonText, 'Mark 3 as read')

	// Now search for the 2nd message
	await macros.setInputValue(incognitoPage, searchSelector, messageDetails[1].payload)

	// Verify only the 2nd message is left in the inbox
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[0].id}]`)
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[2].id}]`)
	messageElements = await incognitoPage.$$(messageSelector)
	test.is(messageElements.length, 1)
	markAsReadButtonText = await macros.getElementText(incognitoPage, markAsReadButtonSelector)
	test.is(markAsReadButtonText, 'Mark 1 as read')

	// Mark just the filtered message as read
	await macros.waitForThenClickSelector(incognitoPage, markAsReadButtonSelector)

	// The filtered message should disappear from the unread inbox
	await macros.waitForSelectorToDisappear(incognitoPage, `[id="event-${messages[1].id}]`)

	// Reload the page
	await incognitoPage.goto(`${environment.ui.host}:${environment.ui.port}/inbox`)

	// And wait for the other two messages to re-appear (still unread)
	await incognitoPage.waitForSelector(`[id="event-${messages[0].id}"]`)
	await incognitoPage.waitForSelector(`[id="event-${messages[2].id}"]`)
})
