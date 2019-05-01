/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
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

ava.serial('Updates to support threads should be reflected in the support thread list', async (test) => {
	const {
		page
	} = context

	await page.goto(`http://localhost:${environment.ui.port}`)
	await context.createUser(user)
	await page.waitForSelector('.login-page')

	await page.type('.login-page__input--username', user.username)
	await page.type('.login-page__input--password', user.password)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel')

	const communityUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})
	await context.addUserToBalenaOrg(communityUser.id)
	await page.reload()

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')

	await page.waitForSelector('.column--view-all-support-threads')

	await page.click('[data-test="lens-selector--lens-support-threads"]')

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread',
			data: {
				inbox: 'S/Paid_Support'
			}
		})
	})

	// Wait for the new support thread to appear in view
	const summarySelector = macros.makeSelector('support-thread-summary', null, supportThread.id)
	await page.waitForSelector(summarySelector)
	await page.click(summarySelector)

	await page.waitForSelector('.rta__textarea')
	await page.click('.rta__textarea')

	const rand = uuid()

	await require('bluebird').delay(10 * 1000)

	const columnSelector = macros.makeSelector('column', null, supportThread.id)
	await macros.createChatMessage(page, columnSelector, `%${rand}`)

	const messageSelector = `${summarySelector} ${macros.makeSelector('support-thread-summary__message')}`

	const messageText = await macros.getElementText(page, messageSelector)

	test.is(rand, messageText)
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
				inbox: 'S/Paid_Support'
			}
		})
	}, name)

	await page.waitForSelector('[data-test="card-linker-action"]')

	await page.click('[data-test="card-linker-action"]')

	await page.waitForSelector('[data-test="card-linker-action--existing"]')
	await page.click('[data-test="card-linker-action--existing"]')

	await page.waitForSelector('[data-test="card-linker--existing__input"]')
	await page.click('[data-test="card-linker--existing__input"]')

	await page.type('#react-select-2-input', name)

	await page.waitForSelector('#react-select-2-option-0')

	await page.keyboard.press('Enter')

	await page.click('[data-test="card-linker--existing__submit"]')

	await page.waitForSelector('[data-test="support-thread__expand"]')
	await page.click('[data-test="support-thread__expand"]')

	await page.waitForSelector('[data-test="support-thread__linked-support-issue"]')

	const issueWithLinks = await page.evaluate((card) => {
		return window.sdk.card.getWithLinks(card.id, 'support issue has attached support thread')
	}, supportIssue)

	test.is(
		issueWithLinks.links['support issue has attached support thread'][0].type,
		'support-thread'
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
				inbox: 'S/Paid_Support'
			}
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/support-thread~${supportThread.id}`)

	const columnSelector = macros.makeSelector('column', null, supportThread.id)
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
				inbox: 'S/Paid_Support'
			}
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/support-thread~${supportThread.id}`)

	const columnSelector = macros.makeSelector('column', null, supportThread.id)
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
				inbox: 'S/Paid_Support'
			}
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/support-thread~${supportThread.id}`)

	const columnSelector = macros.makeSelector('column', null, supportThread.id)
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
				inbox: 'S/Paid_Support'
			}
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/support-thread~${supportThread.id}`)

	const columnSelector = macros.makeSelector('column', null, supportThread.id)
	await page.waitForSelector(columnSelector)

	const rand = uuid()

	await macros.createChatMessage(page, columnSelector, `${rand}`)

	const messageText = await macros.getElementText(page, '.event-card--whisper [data-test="event-card__message"]')

	test.is(rand, messageText.trim())
})
