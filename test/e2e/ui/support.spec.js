const {
	test, expect
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const serverHelpers = require('../server/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

let sdk = {}
let communityUser = {}
const user = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

const addSupportThreadWithMessage = async (page) => {
	// Create new support threads, each with a message
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messagePayload = `Message: ${uuid()}`
	const messageEvent = {
		target: supportThread,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: messagePayload
		}
	}

	const message = await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent)

	return {
		message,
		supportThread,
		messagePayload
	}
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	communityUser = await helpers.createUser(sdk, user)
	await helpers.addUserToBalenaOrg(sdk, communityUser.id)
})

test.beforeEach(async ({
	page
}) => {
	await macros.loginUser(page, user)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test('Updates to support threads should be reflected in the support thread list', async ({
	page
}) => {
	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])
	await page.waitForSelector('.column--view-paid-support-threads')
	await page.locator('[data-test="lens-selector--lens-support-threads"]').click()

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Wait for the new support thread to appear in view
	const summarySelector = `[data-test-component="card-chat-summary"][data-test-id="${supportThread.id}"]`
	await page.locator(summarySelector).click()
	await page.locator('[data-test="timeline-tab"]').click()
	await page.locator('.rta__textarea').click()

	const rand = uuid()
	const columnSelector = '.column--support-thread'
	await macros.createChatMessage(page, columnSelector, `%${rand}`)
	const messageSelector = `${summarySelector} [data-test="card-chat-summary__message"]`
	const messageText = await macros.getElementText(page, messageSelector)
	expect(messageText.trim()).toEqual(rand)
})

test('Updates to messages should be reflected in the threads timeline', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messageTextBefore = 'Message before'
	const messageTextAfter = 'Message after'
	const messageEvent = {
		target: supportThread,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: messageTextBefore
		}
	}
	const message = await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent)

	// Verify the message text
	await page.goto(`/${supportThread.id}`)
	await page.locator('[data-test="timeline-tab"]').click()
	const messageText = await macros.getElementText(page, '[data-test="event-card__message"]')
	expect(messageText.trim()).toEqual(messageTextBefore)

	// Now update the message
	await page.evaluate(({
		messageId, newMessage
	}) => {
		return window.sdk.card.update(messageId, 'message', [
			{
				op: 'replace',
				path: '/data/payload/message',
				value: newMessage
			}
		])
	}, {
		messageId: message.id, newMessage: messageTextAfter
	})

	// Wait for the updated message text to appear
	await page.waitForSelector(`//*[@data-test="event-card__message"]//p[text()="${messageTextAfter}"]`)
})

test('A messages mirror icon is automatically updated when the message is mirrored', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				mirrors: [ 'https://github.com' ],
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messageEvent = {
		target: supportThread,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: 'A message'
		}
	}

	const message = await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent)

	await page.goto(`/${supportThread.id}`)
	await page.locator('[data-test="timeline-tab"]').click()

	// Verify the mirror icon is present but not synced
	await page.waitForSelector('.unsynced[data-test="mirror-icon"]')

	// Now update the message
	await page.evaluate(({
		messageId
	}) => {
		return window.sdk.card.update(messageId, 'message', [
			{
				op: 'add',
				path: '/data/mirrors',
				value: [ 'https://github.com' ]
			}
		])
	}, {
		messageId: message.id
	})

	// The mirror icon is now synced
	await page.waitForSelector('.synced[data-test="mirror-icon"]')
})

test('Support thread timeline should default to sending whispers', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const rand = uuid()
	await page.goto(`/${supportThread.id}`)
	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await macros.createChatMessage(page, columnSelector, `${rand}`)
	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')
	expect(messageText.trim()).toEqual(rand)
})

test('Support thread timeline should send a message if the input is prefixed with a "%" character', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const rand = uuid()
	const columnSelector = '.column--support-thread'
	await page.goto(`/${supportThread.id}`)
	await page.waitForSelector(columnSelector)

	await page.locator('[data-test="timeline-tab"]').click()
	await macros.createChatMessage(page, columnSelector, `%${rand}`)
	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')
	expect(messageText.trim()).toEqual(rand)
})

test('Support thread timeline should send a message if the whisper button is toggled', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const rand = uuid()
	const columnSelector = '.column--support-thread'
	await page.goto(`/${supportThread.id}`)
	await page.waitForSelector(columnSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await page.locator('[data-test="timeline__whisper-toggle"]').click()
	await macros.createChatMessage(page, columnSelector, `${rand}`)
	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')
	expect(messageText.trim()).toEqual(rand)
})

test('Support thread timeline should revert to "whisper" mode after sending a message', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const rand = uuid()
	const columnSelector = '.column--support-thread'
	await page.goto(`/${supportThread.id}`)
	await page.waitForSelector(columnSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await macros.createChatMessage(page, columnSelector, `${rand}`)
	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')
	expect(messageText.trim()).toEqual(rand)
})

// TODO Make this test pass
test.skip('Users should be able to audit a support thread', async ({
	page
}) => {
	// Create a closed support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'closed'
			}
		})
	})

	// A closed support thread should display the audit panel
	const columnSelector = '.column--support-thread'
	await page.goto(`/${supportThread.id}`)
	await page.waitForSelector(columnSelector)
	await page.waitForSelector('[data-test="audit-panel"]')

	// A feedback from should be shown for the support agent
	const name = 'test product issue'
	await page.locator('[data-test="create-improvement"]').click()
	await page.waitForSelector('[data-test="create-lens"]')
	await macros.setInputValue(page, '#root_name', name)
	await new Promise((resolve) => {
		setTimeout(resolve, 1000)
	})
	await page.locator('[data-test="card-creator__submit"]').click()
	await new Promise((resolve) => {
		setTimeout(resolve, 1000)
	})
	const threadWithIssue = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'support thread is attached to improvement')
	}, supportThread.id)
	const issueFromDB = threadWithIssue.links['support thread is attached to improvement'][0]
	expect(issueFromDB.name).toEqual(name)
	expect(issueFromDB.type).toEqual('improvement', 'Should be able to create a new improvement')
	expect(issueFromDB.data.repository).toEqual('balena-io/balena', 'The issue should be created on the balena product repo')
	await page.locator('[data-test="open-agent-feedback-modal"]').click()

	const scores = [
		{
			slug: 'empathy',
			value: 1
		},
		{
			slug: 'knowledge',
			value: 0
		},
		{
			slug: 'process',
			value: -1
		},
		{
			slug: 'grammar',
			value: 1
		},
		{
			slug: 'effort',
			value: 1
		}
	]

	// Fill in the feedback from with responses
	for (const score of scores) {
		let identifier = 'positive'
		if (score.value !== 1) {
			identifier = score.value === 0 ? 'neutral' : 'negative'
		}
		await page.locator(`[data-test="feedback-form__${score.slug}--${identifier}"]`).click()
	}

	// Submit the feedback form
	await page.locator('[data-test="feedback-form__submit"]').click()

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')

	// Add a small delay to allow for the link creation to occur
	// TODO: Add a "wait" method to the SDK that will resolve once a matching
	// document is found in the database
	await new Promise((resolve) => {
		setTimeout(resolve, 8000)
	})

	const threadWithFeedback = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'is source for')
	}, supportThread.id)
	const feedbackItemFromDB = threadWithFeedback.links['is source for'][0]
	expect(feedbackItemFromDB.type).toEqual('feedback-item')

	for (const score of scores) {
		expect(feedbackItemFromDB.data.feedback[score.slug]).toEqual(score.value)
	}

	await page.locator('[data-test="skip-step"]').click()

	// Finish auditing
	await page.locator('[data-test="finish-auditing"]').click()

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'Success!')
	await new Promise((resolve) => {
		setTimeout(resolve, 2000)
	})
	const archivedThread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)
	expect(archivedThread.data.status).toEqual('archived')
})

test('Support threads should close correctly in the UI even when being updated at a high frequency', async ({
	page
}) => {
	// Create an open support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			name: 'test thread',
			data: {
				status: 'open'
			}
		})
	})

	await page.goto('/view-paid-support-threads...properties.data.properties.status+is+open')
	await page.waitForSelector('[data-test="lens--lens-support-threads"]')
	const summarySelector = `[data-test-component="card-chat-summary"][data-test-id="${supportThread.id}"]`
	await page.waitForSelector(summarySelector)

	// Generate a large batch of updates to the "name" field, followed by
	// a single update that sets the status to closed.
	// The expected behaviour is that even with the high volume of update to
	// a single card in a short space of time, the UI should eventually set the
	// support thread to closed and stop displaying it. This guards against race
	// conditions where one of the UI operations cause by the update would resolve
	// after the close operation, resulting in the support thread still staying
	// open
	await page.evaluate((id) => {
		const updates = []
		let count = 10
		while (count--) {
			updates.push(window.sdk.card.update(id, 'support-thread@1.0.0', [
				{
					op: 'replace',
					path: '/name',
					value: `foobar ${count}`
				}
			]))
		}
		return window.Promise.all(updates)
	}, supportThread.id)

	await page.evaluate((id) => {
		return window.sdk.card.update(id, 'support-thread@1.0.0', [
			{
				op: 'replace',
				path: '/data/status',
				value: 'closed'
			}
		])
	}, supportThread.id)
	await macros.waitForSelectorToDisappear(page, summarySelector, 150)
})

test.skip('My Participation shows only support threads that the logged-in user has participated in', async ({
	page
}) => {
	// Add a support thread and message that should _not_ appear in the new user's My Participation view
	const supportThread1 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messageEvent1 = {
		target: supportThread1,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: uuid()
		}
	}

	await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent1)

	// Create a new user and login as that user
	const otherUser = serverHelpers.generateUserDetails()
	const otherCommunityUser = await helpers.createUser(sdk, otherUser)
	await helpers.addUserToBalenaOrg(sdk, otherCommunityUser.id)
	await macros.logout(page)
	await macros.loginUser(page, otherUser)

	await page.waitForSelector('[data-test="home-channel__group-toggle--org-balena"]')

	// Go to the My Participation view and verify there are no threads listed
	await page.goto('/view-support-threads-participation')
	await page.waitForSelector('[data-test="alt-text--no-results"]')

	// Add a new support thread and send a message in it
	const supportThread2 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messageText2 = uuid()
	const messageEvent2 = {
		target: supportThread2,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: messageText2
		}
	}
	await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent2)

	await page.goto('/view-support-threads-participation')
	await page.waitForSelector('[data-test="alt-text--no-results"]')

	// Verify the expected support thread is now listed
	await page.waitForSelector('[data-test-component="card-chat-summary"]')

	const actualMessageText2 = await macros.getElementText(
		page,
		`[data-test-id="${supportThread2.id}"] [data-test="card-chat-summary__message"] p`
	)
	expect(actualMessageText2.trim()).toEqual(messageText2)
})

test('A user can edit their own message', async ({
	page
}) => {
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	const messageTextBefore = 'Message before'
	const messageSuffix = ' - edited'
	const messageTextAfter = `${messageTextBefore}${messageSuffix}`
	const messageEvent = {
		target: supportThread,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: messageTextBefore
		}
	}
	await page.evaluate((event) => {
		return window.sdk.event.create(event)
	}, messageEvent)

	// Navigate to the thread and wait for the message event to be displayed
	await page.goto(`/${supportThread.id}`)
	await page.locator('[data-test="timeline-tab"]').click()
	const eventSelector = '.column--support-thread .event-card--message'
	await page.waitForSelector(eventSelector)

	// Open the event actions menu and select the 'Edit Message' button
	await page.locator(`${eventSelector} button.event-card--actions`).click()
	await page.locator(`${eventSelector} [data-test="event-header__link--edit-message"]`).click()

	// Type into the textarea to update the message text
	await page.waitForSelector(`${eventSelector} textarea`)
	await page.type(`${eventSelector} textarea`, messageSuffix)
	await page.locator('[data-test="event-header__btn--save-edit"]').click()

	// Wait for the message to be updated and verify the message text
	const newMessageText = await macros.getElementText(page, `${eventSelector} [data-test="event-card__message"]`)
	expect(newMessageText.trim()).toEqual(messageTextAfter)

	// Verify the event context shows that it has been edited
	await page.hover(eventSelector)
	await page.waitForSelector(`${eventSelector} [data-test="event-card--edited-at"]`)
})

test('You can trigger a quick search for cards from the message input', async ({
	page
}) => {
	const searchResultSelector = '[data-test="quick-search__result"]'
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Navigate to the thread and wait for the thread to be displayed
	await page.goto(`/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Type in a quick search trigger
	await page.type('textarea', ` ?user ${communityUser.slug}`)

	// Verify the quick search results
	await page.waitForSelector(searchResultSelector)
	const searchMatches = await page.$$(searchResultSelector)
	expect(searchMatches.length).toEqual(1)
	const userCardMatch = await macros.getElementText(page, searchResultSelector)
	expect(userCardMatch.trim()).toEqual(communityUser.slug)

	// Now click on the quick search result and verify the corresponding card is loaded in a new channel
	await page.locator(searchResultSelector).click()
	await page.waitForSelector(`.column--slug-${communityUser.slug}`)
})

test('You can select a user and a group from the auto-complete options', async ({
	page
}) => {
	const uuid1 = uuid()
	const username = `${uuid1}-test-user`
	const uuid2 = uuid()
	const groupName = `${uuid2}-test-group`

	const testUser = await helpers.createUser(sdk, {
		username,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})
	await helpers.addUserToBalenaOrg(sdk, testUser.id)
	await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'group@1.0.0',
			name
		})
	}, groupName)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Navigate to the thread and wait for the thread to be displayed
	await page.goto(`/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Use auto-complete to find a user
	await page.type('textarea', `@${uuid1}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const userMatches = await page.$$('.rta__autocomplete .rta__item')
	expect(userMatches.length).toEqual(1)
	const userMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item:first-child')
	expect(userMatch.trim().substr(1)).toEqual(username)

	// Select the first item from the auto-complete suggestions (note: this also appends a space to the message)
	await page.keyboard.press('Enter')

	// Now user auto-complete to find a group
	await page.type('textarea', `@@${uuid2}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const groupMatches = await page.$$('.rta__autocomplete .rta__item')
	expect(groupMatches.length).toEqual(1)
	const groupMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item:first-child')
	expect(groupMatch.trim().substr(2)).toEqual(groupName)

	// Select the first item from the auto-complete suggestions
	await page.keyboard.press('Enter')
	const textareaText = await macros.getElementText(page, 'textarea')
	expect(textareaText.trim()).toEqual(`@${username} @@${groupName}`)
})

test('Only users with a name matching the search string are returned by the autocomplete', async ({
	page
}) => {
	const matchingUsername = `${uuid()}-test-user`
	const matchingUser = await helpers.createUser(sdk, {
		username: matchingUsername,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})
	const matchingFirstname = `matching-${uuid()}`
	await helpers.updateUser(sdk, matchingUser.id, [ {
		op: 'add',
		path: '/data/profile',
		value: {
			name: {
				first: matchingFirstname
			}
		}
	} ])
	await helpers.addUserToBalenaOrg(sdk, matchingUser.id)

	const nonMatchingUser = await helpers.createUser(sdk, {
		username: `${uuid()}-test-user`,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})
	await helpers.updateUser(sdk, nonMatchingUser.id, [ {
		op: 'add',
		path: '/data/profile',
		value: {
			name: {
				first: uuid()
			}
		}
	} ])
	await helpers.addUserToBalenaOrg(sdk, nonMatchingUser.id)

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Navigate to the thread and wait for the thread to be displayed
	await page.goto(`/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)
	await page.locator('[data-test="timeline-tab"]').click()
	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Use auto-complete to find a user by firstname
	await page.type('textarea', `@${matchingFirstname}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const userMatches = await page.$$('.rta__autocomplete .rta__item')
	expect(userMatches.length).toEqual(1)
	const userMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item')
	expect(userMatch.trim().substr(1).includes(matchingUsername)).toBeTruthy()

	// Select the first item from the auto-complete suggestions (note: this also appends a space to the message)
	await page.keyboard.press('Enter')
	const textareaText = await macros.getElementText(page, 'textarea')
	expect(textareaText.trim()).toEqual(`@${matchingUsername}`)
})

test('Should be able to navigate to chart lens of support threads', async ({
	page
}) => {
	// Ensure there is at least one support thread created!
	await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])

	await page.locator('[data-test="lens-selector--lens-chart"]').click()
	await page.waitForSelector('.plotly')

	// Return to the expected lens
	await page.locator('[data-test="lens-selector--lens-support-threads"]').click()
})

test('Closed support threads should be re-opened on new message', async ({
	page
}) => {
	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])
	await page.waitForSelector('.column--view-paid-support-threads')
	await page.locator('[data-test="lens-selector--lens-support-threads"]').click()

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Wait for the new support thread to appear in view
	const summarySelector = `[data-test-component="card-chat-summary"][data-test-id="${supportThread.id}"]`
	await page.locator(summarySelector).click()

	// Close support thread
	await page.evaluate((id) => {
		return window.sdk.card.update(id, 'support-thread@1.0.0', [
			{
				op: 'replace',
				path: '/data/status',
				value: 'closed'
			}
		])
	}, supportThread.id)

	// Wait for the status to change as a heuristic for the action completing
	await page.waitForSelector('[data-test="status-closed"]')

	// Confirm that the support thread is now closed
	let thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)
	expect(thread.data.status).toEqual('closed')

	// Switch to timeline tab
	await page.locator('[data-test="timeline-tab"]').click()

	// Add new message to the closed support thread
	await page.locator('.rta__textarea').click()
	await macros.createChatMessage(page, '.column--support-thread', `%${uuid()}`)

	// Wait for the status to change as a heuristic for the action completing
	await page.waitForSelector('[data-test="status-open"]')

	// Confirm that the support thread is now open
	thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)
	expect(thread.data.status).toEqual('open')
})

test('Should be able to filter support threads by simple search', async ({
	page
}) => {
	const [ thread1, thread2 ] = await Promise.all([
		addSupportThreadWithMessage(page),
		addSupportThreadWithMessage(page)
	])

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])

	const selectors = {
		threadSummary1: `[data-test-id="${thread1.supportThread.id}"]`,
		threadSummary2: `[data-test-id="${thread2.supportThread.id}"]`,
		searchInput: '.view__search input'
	}

	// Both threads should appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await page.waitForSelector(selectors.threadSummary2)

	// Now search for text in the 1st thread's message
	await macros.setInputValue(page, selectors.searchInput, thread1.messagePayload)

	// Only the first thread should now appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await macros.waitForSelectorInsideScrollableToDisappear(
		page,
		'[data-test="infinitelist__scrollarea"]',
		selectors.threadSummary2
	)

	// Now clear the search
	await macros.clearInput(page, selectors.searchInput)

	// And the second thread should re-appear in the list
	await page.waitForSelector(selectors.threadSummary2)
})

test('Should be able to filter support threads by timeline message', async ({
	page
}) => {
	const [ thread1, thread2 ] = await Promise.all([
		addSupportThreadWithMessage(page),
		addSupportThreadWithMessage(page)
	])

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])

	const selectors = {
		threadSummary1: `[data-test-id="${thread1.supportThread.id}"]`,
		threadSummary2: `[data-test-id="${thread2.supportThread.id}"]`,
		showFiltersButton: '[data-test="show-filters"]',
		addFilterButton: '//button[div[text()="Add filter"]]',
		filterModalFieldSelect: '#filtermodal__fieldselect',
		fieldSelectSearch: '#filtermodal__fieldselect__select-drop input',
		fieldSelectTimelineOption:
			'//*[@id="filtermodal__fieldselect__select-drop"]//button[div[span[text()="Timeline message"]]]',
		filterModalValueInput: 'input[operator="contains"]',
		filterModalSaveButton: '//button[text()="Save"]',
		timelineSummaryClearButton: '//*[@data-test="view__filters-summary-wrapper"]' +
		'//button[div[div[text()="Timeline message contains "]]]/following-sibling::button'
	}

	// Both threads should appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await page.waitForSelector(selectors.threadSummary2)

	// Now filter by timeline message for text in the 1st thread's message
	await page.locator(selectors.showFiltersButton).click()
	await page.locator(selectors.addFilterButton).click()
	await page.locator(selectors.filterModalFieldSelect).click()
	await page.waitForSelector(selectors.fieldSelectSearch)
	await macros.setInputValue(page, selectors.fieldSelectSearch, 'Timeline message')
	await new Promise((resolve) => {
		setTimeout(resolve, 500)
	})
	await page.locator(selectors.fieldSelectTimelineOption).click()
	await macros.setInputValue(page, selectors.filterModalValueInput, thread1.messagePayload)
	await page.locator(selectors.filterModalSaveButton).click()

	// Only the first thread should now appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await macros.waitForSelectorInsideScrollableToDisappear(
		page,
		'[data-test="infinitelist__scrollarea"]',
		selectors.threadSummary2
	)

	// Now clear the filter
	await page.locator(selectors.timelineSummaryClearButton).click()

	// And the second thread should re-appear in the list
	await page.waitForSelector(selectors.threadSummary2)
})

test('Should be able to filter support threads by a field in a linked contract', async ({
	page
}) => {
	const [ thread1, thread2 ] = await Promise.all([
		addSupportThreadWithMessage(page),
		addSupportThreadWithMessage(page)
	])

	// Add a pattern and link it to the first thread
	const patternName = `Pattern ${uuid()}`
	const pattern = await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'pattern@1.0.0',
			name,
			data: {
				status: 'open'
			}
		})
	}, patternName)

	await page.evaluate((options) => {
		return window.sdk.card.link(options.thread, options.pattern, 'has attached')
	}, {
		thread: thread1.supportThread, pattern
	})

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-paid-support-threads"]'
	])

	const selectors = {
		threadSummary1: `[data-test-id="${thread1.supportThread.id}"]`,
		threadSummary2: `[data-test-id="${thread2.supportThread.id}"]`,
		showFiltersButton: '[data-test="show-filters"]',
		addFilterButton: '//button[div[text()="Add filter"]]',
		filterModalFieldSelect: '#filtermodal__fieldselect',
		fieldSelectSearch: '#filtermodal__fieldselect__select-drop input',
		fieldSelectPatternNameOption:
			'//*[@id="filtermodal__fieldselect__select-drop"]//button[div[span[text()="🔗 Pattern: Name"]]]',
		filterModalValueInput: 'input[operator="contains"]',
		filterModalSaveButton: '//button[text()="Save"]',
		patternNameSummaryClearButton: '//*[@data-test="view__filters-summary-wrapper"]' +
		'//button[div[div[text()="🔗 Pattern: Name contains "]]]/following-sibling::button'
	}

	// Both threads should appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await page.waitForSelector(selectors.threadSummary2)

	// Now filter by pattern name
	await page.locator(selectors.showFiltersButton).click()
	await page.locator(selectors.addFilterButton).click()
	await page.locator(selectors.filterModalFieldSelect).click()
	await page.waitForSelector(selectors.fieldSelectSearch)
	await macros.setInputValue(page, selectors.fieldSelectSearch, '🔗 Pattern: Name')
	await new Promise((resolve) => {
		setTimeout(resolve, 500)
	})
	await page.locator(selectors.fieldSelectPatternNameOption).click()
	await macros.setInputValue(page, selectors.filterModalValueInput, patternName)
	await page.locator(selectors.filterModalSaveButton).click()

	// Only the first thread should now appear in the list
	await page.waitForSelector(selectors.threadSummary1)
	await macros.waitForSelectorInsideScrollableToDisappear(
		page,
		'[data-test="infinitelist__scrollarea"]',
		selectors.threadSummary2
	)

	// Now clear the filter
	await page.locator(selectors.patternNameSummaryClearButton).click()

	// And the second thread should re-appear in the list
	await page.waitForSelector(selectors.threadSummary2)
})
