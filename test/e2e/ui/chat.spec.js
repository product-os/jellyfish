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

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const {
		page,
		browser
	} = context

	await page.goto(`http://localhost:${environment.ui.port}`)
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

	await incognitoPage.goto(`http://localhost:${environment.ui.port}`)
	const user2 = await context.createUser(userDetails2)
	await macros.loginUser(incognitoPage, userDetails2)
	await context.addUserToBalenaOrg(user2.id)
	await incognitoPage.reload()

	context.incognitoPage = incognitoPage
})

ava.after(async () => {
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
			type: 'thread'
		})
	})

	// Navigate to the thread page
	await incognitoPage.goto(`http://localhost:${environment.ui.port}/${thread.id}`)
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

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
			type: 'thread'
		})
	})

	const thread2 = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the thread page
	await page.goto(`http://localhost:${environment.ui.port}/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await page.type('textarea', rand)

	// The delay here isn't ideal, but it helps mitigate issues that can occur due
	// to the message preservation being debounced in the UI
	await Bluebird.delay(5000)

	await page.goto(`http://localhost:${environment.ui.port}/${thread2.id}`)
	await page.waitForSelector(`.column--slug-${thread2.slug}`)

	await page.goto(`http://localhost:${environment.ui.port}/${thread1.id}`)
	await page.waitForSelector(`.column--slug-${thread1.slug}`)

	const messageText = await macros.getElementText(page, 'textarea')

	test.is(messageText, rand)

	test.pass()
})
