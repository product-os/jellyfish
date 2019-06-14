/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const path = require('path')
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

ava.serial('Users should be able to upload an image', async (test) => {
	const {
		page
	} = context

	await page.goto(`http://localhost:${environment.ui.port}`)
	const user = await context.createUser(userDetails)
	await page.waitForSelector('.login-page')

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
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector('.column--thread [data-test="event-card__image"]')

	test.pass()
})

ava.serial('Users should be able to upload an image to a support thread', async (test) => {
	const {
		page
	} = context

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	const selector = `[data-test-component="column"][data-test-id="${thread.id}"]`

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector(`${selector} [data-test="event-card__image"]`)

	test.pass()
})

ava.serial('Users should be able to upload a text file', async (test) => {
	const {
		page
	} = context

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector('.column--thread [data-test="event-card__file"]')

	test.pass()
})

ava.serial('Users should be able to upload a text file to a support thread', async (test) => {
	const {
		page
	} = context

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread'
		})
	})

	// Navigate to the user profile page
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	const selector = `[data-test-component="column"][data-test-id="${thread.id}"]`

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector(`${selector} [data-test="event-card__file"]`)

	test.pass()
})
