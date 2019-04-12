/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
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

	await page.goto(`http://localhost:${environment.ui.port}`)
	const user = await context.createUser(userDetails)
	await page.waitForSelector('.login-page')

	context.user = user

	await page.type('.login-page__input--username', userDetails.username)
	await page.type('.login-page__input--password', userDetails.password)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel')

	await context.addUserToBalenaOrg(user.id)
	await page.reload()

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/#/user~${user.id}/thread~${thread.id}`)

	await page.waitForSelector('[data-test="lens--lens-my-user"]')

	const element = await page.$('[data-test="lens-my-user__send-command-select"] select')
	const value = await page.evaluate((elem) => {
		return elem.value
	}, element)

	// Assert a sane default value
	test.is(value, 'shift+enter')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
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

	await page.select('[data-test="lens-my-user__send-command-select"] select', 'enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/thread~${thread.id}`)

	await page.waitForSelector('.column--thread')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)
	await page.keyboard.press('Enter')
	await page.waitForSelector('.column--thread [data-test="event-card__message"]')

	test.pass()
})

ava.serial('You should be able to change the send command to "ctrl+enter"', async (test) => {
	const {
		page,
		user
	} = context

	await page.goto(`http://localhost:${environment.ui.port}/#/user~${user.id}`)

	await page.waitForSelector('[data-test="lens-my-user__send-command-select"] select')
	await page.select('[data-test="lens-my-user__send-command-select"] select', 'ctrl+enter')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	await page.goto(`http://localhost:${environment.ui.port}/#/thread~${thread.id}`)

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
