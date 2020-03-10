/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const macros = require('./macros')
const environment = require('../../../lib/environment')

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
	const communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(communityUser.id)
	await macros.loginUser(context.page, user)
})

ava.serial.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Updates to support threads should be reflected in the support thread list', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')

	await page.waitForSelector('.column--view-all-support-threads')

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-support-threads"]')

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
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

ava.serial('You should be able to link support threads to existing support issues', async (test) => {
	const {
		page
	} = context
	const name = `test-support-issue-${uuid()}`

	const supportIssue = await page.evaluate((cardName) => {
		return window.sdk.card.create({
			type: 'support-issue',
			name: cardName,
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	}, name)

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker-action--existing"]')

	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"]')

	await page.type('#react-select-2-input', name)

	await page.waitForSelector('#react-select-2-option-0')

	await page.keyboard.press('Enter')

	await page.click('[data-test="card-linker--existing__submit"]')

	await macros.waitForThenClickSelector(page, '[data-test="support-thread__expand"]')

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
			type: 'support-thread',
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
			type: 'support-thread',
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
			type: 'support-thread',
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
			type: 'support-thread',
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

ava.serial('Users should be able to close a support thread', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	await page.goto(`${environment.ui.host}:${environment.ui.port}/${supportThread.id}`)

	await page.waitForSelector('.column--support-thread')

	await macros.waitForThenClickSelector(page, '[data-test="support-thread__close-thread"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	const thread = await page.evaluate((id) => {
		return window.sdk.card.get(id)
	}, supportThread.id)

	test.is(thread.data.status, 'closed')
})

ava.serial('Users should be able to close a support thread by sending a message with #summary', async (test) => {
	const {
		page
	} = context

	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
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
			type: 'support-thread',
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
	await page.waitForSelector('[data-test="alert--success"]')

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
	await page.waitForSelector('[data-test="alert--success"]')
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
			type: 'support-thread',
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

	// Generate a large batch of 20 updates to the "name" field, followed by
	// a single update that sets the status to closed.
	// The expected behaviour is that even with the high volume of update to
	// a single card in a short space of time, the UI should eventually set the
	// support thread to closed and stop displaying it. This guards against race
	// conditions where one of the UI operations cause by the update would resolve
	// after the close operation, resulting in the support thread still staying
	// open
	await page.evaluate((id) => {
		const updates = []
		let count = 100
		while (count--) {
			updates.push(window.sdk.card.update(id, 'support-thread', [
				{
					op: 'replace',
					path: '/name',
					value: `foobar ${count}`
				}
			]))
		}

		updates.push(
			window.sdk.card.update(id, 'support-thread', [
				{
					op: 'replace',
					path: '/data/status',
					value: 'closed'
				}
			])
		)

		return window.Promise.all(updates)
	}, supportThread.id)

	await macros.waitForSelectorToDisappear(page, summarySelector, 150)

	test.pass('Support thread closed correctly')
})
