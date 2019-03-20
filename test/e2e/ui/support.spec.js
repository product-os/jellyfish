/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const randomstring = require('randomstring')
const helpers = require('./helpers')
const macros = require('./macros')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${randomstring.generate(20)}`
	}
}

const user = {
	username: `johndoe-${randomstring.generate().toLowerCase()}`,
	email: `johndoe-${randomstring.generate().toLowerCase()}@example.com`,
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
		page,
		server
	} = context

	await page.goto(`http://localhost:${server.port}`)
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

	await page.waitForSelector('.home-channel__group-toggle--org-balena')
	await page.click('.home-channel__group-toggle--org-balena')

	await page.waitForSelector('.home-channel__item--view-all-support-threads')
	await page.click('.home-channel__item--view-all-support-threads')

	await page.waitForSelector('.column--view-all-support-threads')
	await page.click('.column--view-all-support-threads')

	// Create a new support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread'
		})
	})

	// Wait for the new support thread to appear in view
	const summarySelector = macros.makeSelector('support-thread-summary', null, supportThread.id)
	await page.waitForSelector(summarySelector)
	await page.click(summarySelector)

	await page.waitForSelector('.rta__textarea')
	await page.click('.rta__textarea')

	const rand = randomstring.generate()

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
	const name = `test-support-issue-${randomstring.generate().toLowerCase()}`

	const supportIssue = await page.evaluate((cardName) => {
		return window.sdk.card.create({
			type: 'support-issue',
			name: cardName
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
		return window.sdk.card.get(card.id, {
			type: 'support-issue'
		})
	}, supportIssue)

	test.is(
		issueWithLinks.links['support issue has attached support thread'][0].type,
		'support-thread'
	)
})
