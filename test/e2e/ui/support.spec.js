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
const environment = require('@balena/jellyfish-environment')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const user = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	context.communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(context.communityUser.id)
	await macros.loginUser(context.page, user)
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Updates to support threads should be reflected in the support thread list', async (test) => {
	const {
		page
	} = context

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Support"]',
		'[data-test="home-channel__item--view-all-support-threads"]'
	])

	await page.waitForSelector('.column--view-all-support-threads')

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-support-threads"]')

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
	await macros.waitForThenClickSelector(page, summarySelector)

	await macros.waitForThenClickSelector(page, '.rta__textarea')

	const rand = uuid()

	const columnSelector = '.column--support-thread'
	await macros.createChatMessage(page, columnSelector, `%${rand}`)

	const messageSelector = `${summarySelector} [data-test="card-chat-summary__message"]`

	const messageText = await macros.getElementText(page, messageSelector)

	test.is(rand, messageText.trim())
})

ava.serial('Updates to messages should be reflected in the thread\'s timeline', async (test) => {
	const {
		page
	} = context
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

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	// Verify the message text
	const messageText = await macros.getElementText(page, '[data-test="event-card__message"]')
	test.is(messageText.trim(), messageTextBefore)

	// Now update the message...
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

	// ... and wait for the updated message text to appear
	await page.waitForXPath(`//*[@data-test="event-card__message"]//p[text()="${messageTextAfter}"]`)

	// Boom! It worked!
	test.pass()
})

ava.serial('A message\'s mirror icon is automatically updated when the message is mirrored', async (test) => {
	const {
		page
	} = context
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

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	// Verify the mirror icon is present but not synced
	await page.waitForSelector('.unsynced[data-test="mirror-icon"]')

	// Now update the message...
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
	test.pass()
})

ava.serial('You should be able to link support threads to existing support issues', async (test) => {
	const {
		page
	} = context
	const name = `test-support-issue-${uuid()}`

	const supportIssue = await page.evaluate((cardName) => {
		return window.sdk.card.create({
			type: 'support-issue@1.0.0',
			name: cardName,
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	}, name)

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action--existing"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker--type__input"]')

	// Select the 'Support issue' option from the dropdown
	const supportIssueOption = await page.waitForXPath(
		'//*[@id="card-linker--type-select__select-drop"]//span[text()="Support issue"]'
	)
	supportIssueOption.click()

	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"] input')

	await page.type('.jellyfish-async-select__input input', name)

	await macros.waitForThenClickSelector(page, '.jellyfish-async-select__option--is-focused')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__submit"]:not(:disabled)')

	await macros.waitForThenClickSelector(page, '[data-test="support-thread-details__header"]')

	await page.waitForSelector('[data-test="support-thread__linked-support-issue"]')

	const issueWithLinks = await page.evaluate((card) => {
		return window.sdk.card.getWithLinks(card.id, 'support issue has attached support thread')
	}, supportIssue)

	test.is(
		issueWithLinks.links['support issue has attached support thread'][0].type,
		'support-thread@1.0.0'
	)
})

ava.serial('Support thread timeline should default to sending whispers', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should send a message if the input is prefixed with a "%" character', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `%${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should send a message if the whisper button is toggled', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	await macros.waitForThenClickSelector(page, '[data-test="timeline__whisper-toggle"]')

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--message [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Support thread timeline should revert to "whisper" mode after sending a message', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})

ava.serial('Users should be able to close a support thread by sending a message with #summary', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	const columnSelector = '.column--support-thread'

	await page.waitForSelector(columnSelector)

	await macros.createChatMessage(page, columnSelector, '#summary')

	// Wait for the status to change as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="status-closed"]')

	const thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(thread.data.status, 'closed')
})

// TODO Make this test pass
ava.serial.skip('Users should be able to audit a support thread', async (test) => {
	const {
		page
	} = context

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

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const columnSelector = '.column--support-thread'
	await page.waitForSelector(columnSelector)
	await page.waitForSelector('[data-test="audit-panel"]')

	test.pass('A closed support thread should display the audit panel')

	await macros.waitForThenClickSelector(page, '[data-test="create-product-improvement"]')
	await page.waitForSelector('[data-test="create-lens"]')

	const name = 'test product issue'

	await macros.setInputValue(page, '#root_name', name)
	await Bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await Bluebird.delay(5000)

	const threadWithIssue = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'support thread is attached to product improvement')
	}, supportThread.id)

	const issueFromDB = threadWithIssue.links['support thread is attached to product improvement'][0]

	test.is(issueFromDB.name, name)
	test.is(issueFromDB.type, 'product-improvement', 'Should be able to create a new product improvement')
	test.is(issueFromDB.data.repository, 'balena-io/balena', 'The issue should be created on the balena product repo')

	await macros.waitForThenClickSelector(page, '[data-test="open-agent-feedback-modal"]')

	test.pass('A feedback from should be shown for the support agent')

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
		await macros.waitForThenClickSelector(page, `[data-test="feedback-form__${score.slug}--${identifier}"]`)
	}

	// Submit the feedback form
	await macros.waitForThenClickSelector(page, '[data-test="feedback-form__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'success')

	// Add a small delay to allow for the link creation to occur
	// TODO: Add a "wait" method to the SDK that will resolve once a matching
	// document is found in the database
	await Bluebird.delay(8000)

	const threadWithFeedback = await page.evaluate((id) => {
		return window.sdk.card.getWithLinks(id, 'is source for')
	}, supportThread.id)

	const feedbackItemFromDB = threadWithFeedback.links['is source for'][0]

	test.is(feedbackItemFromDB.type, 'feedback-item', 'Should be able to create a new feedback item')

	for (const score of scores) {
		test.is(
			feedbackItemFromDB.data.feedback[score.slug],
			score.value,
			`Should set the correct feedback value for ${score.slug}`
		)
	}

	await macros.waitForThenClickSelector(page, '[data-test="skip-step"]')

	// Finish auditing
	await macros.waitForThenClickSelector(page, '[data-test="finish-auditing"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'success')
	await Bluebird.delay(2000)
	const archivedThread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(archivedThread.data.status, 'archived', 'Should be able to archive the thread once auditing is complete')
})

ava.serial('Support threads should close correctly in the UI even when being updated at a high frequency', async (test) => {
	const {
		page
	} = context

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

	await page.goto(
		`${environment.ui.host}:${environment.ui.port}/view-all-support-threads...properties.data.properties.status+is+open`
	)
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

	test.pass('Support thread closed correctly')
})

ava.serial('My Participation shows only support threads that the logged-in user has participated in', async (test) => {
	const {
		sdk,
		page
	} = context

	// Add a support thread and message that should _not_ appear in the new user's My Participation view
	const supportThread1 = await sdk.card.create({
		type: 'support-thread@1.0.0',
		data: {
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	await sdk.event.create({
		target: supportThread1,
		slug: `message-${uuid()}`,
		tags: [],
		type: 'message',
		payload: {
			message: uuid()
		}
	})

	// Create a new user and login as that user
	const otherUser = helpers.generateUserDetails()
	const otherCommunityUser = await context.createUser(otherUser)
	await context.addUserToBalenaOrg(otherCommunityUser.id)
	await macros.logout(page)
	await macros.loginUser(page, otherUser)

	await page.waitForSelector('[data-test="home-channel__group-toggle--org-balena"]')

	// Go to the My Participation view and verify there are no threads listed
	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-support-threads-participation`)
	await page.waitForSelector('[data-test="alt-text--no-support-threads"]')

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

	// Verify the expected support thread is now listed
	await page.waitForSelector('[data-test-component="card-chat-summary"]')
	const actualMessageText2 = await macros.getElementText(
		page,
		`[data-test-id="${supportThread2.id}"] [data-test="card-chat-summary__message"] p`
	)
	test.is(actualMessageText2.trim(), messageText2)
})

ava.serial('A user can edit their own message', async (test) => {
	const {
		page
	} = context

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
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const eventSelector = '.column--support-thread .event-card--message'
	await page.waitForSelector(eventSelector)

	// Open the event actions menu and select the 'Edit Message' button
	await macros.waitForThenClickSelector(page, `${eventSelector} button.event-card--actions`)
	await macros.waitForThenClickSelector(page, `${eventSelector} [data-test="event-header__link--edit-message"]`)

	// Type into the textarea to update the message text
	await page.waitForSelector(`${eventSelector} textarea`)
	await page.type(`${eventSelector} textarea`, messageSuffix)

	await macros.waitForThenClickSelector(page, '[data-test="event-header__btn--save-edit"]')

	// Wait for the message to be updated and verify the message text
	const newMessageText = await macros.getElementText(page, `${eventSelector} [data-test="event-card__message"]`)
	test.is(newMessageText.trim(), messageTextAfter)
})

ava.serial('You can trigger a quick search for cards from the message input', async (test) => {
	const {
		page
	} = context

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
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)

	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Type in a quick search trigger
	await page.type('textarea', ` ?user ${context.communityUser.slug.replace('user-', '')}`)

	// Verify the quick search results
	await page.waitForSelector(searchResultSelector)
	const searchMatches = await page.$$(searchResultSelector)
	test.is(searchMatches.length, 1)
	const userCardMatch = await macros.getElementText(page, searchResultSelector)
	test.is(userCardMatch.trim(), context.communityUser.slug)

	// Now click on the quick search result and verify the corresponding card is loaded in a new channel
	await macros.waitForThenClickSelector(page, searchResultSelector)
	await page.waitForSelector(`.column--slug-${context.communityUser.slug}`)
})

ava.serial('You can select a user and a group from the auto-complete options', async (test) => {
	const {
		page
	} = context

	const uuid1 = uuid()
	const username = `${uuid1}-test-user`
	const uuid2 = uuid()
	const groupName = `${uuid2}-test-group`

	const testUser = await context.createUser({
		username,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})

	await context.addUserToBalenaOrg(testUser.id)

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
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)

	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Use auto-complete to find a user
	await page.type('textarea', `@${uuid1}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const userMatches = await page.$$('.rta__autocomplete .rta__item')
	test.is(userMatches.length, 1)
	const userMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item:first-child')
	test.is(userMatch.trim().substr(1), username)

	// Select the first item from the auto-complete suggestions (note: this also appends a space to the message)
	await page.keyboard.press('Enter')

	// Now user auto-complete to find a group
	await page.type('textarea', `@@${uuid2}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const groupMatches = await page.$$('.rta__autocomplete .rta__item')
	test.is(groupMatches.length, 1)
	const groupMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item:first-child')
	test.is(groupMatch.trim().substr(2), groupName)

	// Select the first item from the auto-complete suggestions
	await page.keyboard.press('Enter')

	const textareaText = await macros.getElementText(page, 'textarea')
	test.is(textareaText.trim(), `@${username} @@${groupName}`)
})

ava.serial('Only users with a name matching the search string are returned by the autocomplete', async (test) => {
	const {
		page
	} = context

	const matchingUsername = `${uuid()}-test-user`

	const matchingUser = await context.createUser({
		username: matchingUsername,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})

	const matchingFirstname = `matching-${uuid()}`

	await context.updateUser(matchingUser.id, [ {
		op: 'add',
		path: '/data/profile',
		value: {
			name: {
				first: matchingFirstname
			}
		}
	} ])

	await context.addUserToBalenaOrg(matchingUser.id)

	const nonMatchingUser = await context.createUser({
		username: `${uuid()}-test-user`,
		email: `test-user-${uuid()}@example.com`,
		password: 'password'
	})

	await context.updateUser(nonMatchingUser.id, [ {
		op: 'add',
		path: '/data/profile',
		value: {
			name: {
				first: uuid()
			}
		}
	} ])

	await context.addUserToBalenaOrg(nonMatchingUser.id)

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
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)
	const threadSelector = '.column--support-thread'
	await page.waitForSelector(threadSelector)

	await page.waitForSelector('.new-message-input', macros.WAIT_OPTS)

	// Use auto-complete to find a user by firstname
	await page.type('textarea', `@${matchingFirstname}`)
	await page.waitForSelector('.rta__autocomplete .rta__item')
	const userMatches = await page.$$('.rta__autocomplete .rta__item')
	test.is(userMatches.length, 1)
	const userMatch = await macros.getElementText(page, '.rta__autocomplete .rta__item')
	test.is(userMatch.trim().substr(1), matchingUsername)

	// Select the first item from the auto-complete suggestions (note: this also appends a space to the message)
	await page.keyboard.press('Enter')
	const textareaText = await macros.getElementText(page, 'textarea')
	test.is(textareaText.trim(), `@${matchingUsername}`)
})
