/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bluebird = require('bluebird')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const macros = require('./macros')
const environment = require('../../../lib/environment')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const userDetails = {
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

ava.serial('The send command should default to "shift+enter"', async (test) => {
	const {
		page
	} = context

	const user = await context.createUser(userDetails)
	context.user = user
	await context.addUserToBalenaOrg(user.id)

	await macros.loginUser(page, userDetails)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/${user.id}/${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(1) > button[role="menuitem"]')

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'shift+enter')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await bluebird.delay(500)
	await page.keyboard.down('Shift')
	await page.keyboard.press('Enter')
	await page.keyboard.up('Shift')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

	test.pass()
})

ava.serial('You should be able to change the send command to "enter"', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(3) > button[role="menuitem"]')

	await bluebird.delay(1000)

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector('.column--thread')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await bluebird.delay(500)
	await page.keyboard.press('Enter')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

	test.pass()
})

ava.serial('You should be able to change the send command to "ctrl+enter"', async (test) => {
	const {
		page,
		user
	} = context

	await page.goto(`http://localhost:${environment.ui.port}/${user.id}`)

	await macros.waitForThenClickSelector(page, 'button[role="tab"]:nth-of-type(3)')

	await macros.waitForThenClickSelector(page, '[data-test="lens-my-user__send-command-select"]')
	await macros.waitForThenClickSelector(page, '[role="menubar"] > div:nth-of-type(2) > button[role="menuitem"]')

	await bluebird.delay(1000)

	const value = await macros.getElementValue(page, '[data-test="lens-my-user__send-command-select"]')
	test.is(value, 'ctrl+enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector('.column--thread')

	// Unfortunately puppeteer Control+Enter doesn't seem to work at all
	// TODO: Fix this test so it works
	/*
	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await page.keyboard.down('ControlLeft')
	await page.keyboard.press('Enter')
	await page.keyboard.up('ControlLeft')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')
	*/

	test.pass()
})
