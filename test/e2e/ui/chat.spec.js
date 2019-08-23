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

	context.user1 = user1
	context.user2 = user2

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

ava.serial('Messages that ping a user should appear in their inbox', async (test) => {
	const {
		user2,
		page,
		incognitoPage
	} = context

	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread'
		})
	})

	// Navigate to the thread page
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`http://localhost:${environment.ui.port}/view-my-inbox`)

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
			type: 'thread'
		})
	})

	// Navigate to the thread page
	await page.goto(`http://localhost:${environment.ui.port}/${thread.id}`)

	const columnSelector = `.column--slug-${thread.slug}`
	await page.waitForSelector(columnSelector)

	const msg = `@${user2.slug.slice(5)} ${uuid()}`

	await page.waitForSelector('.new-message-input')

	await macros.createChatMessage(page, columnSelector, msg)

	// Navigate to the inbox page
	await incognitoPage.goto(`http://localhost:${environment.ui.port}/view-my-inbox`)

	await macros.waitForThenClickSelector(incognitoPage, '[data-test="inbox__mark-all-as-read"]')

	// Leave a small delay for the message to be marked as read and for the change
	// to be propogated to the UI
	await Bluebird.delay(4000)

	const messages = await incognitoPage.$$('[data-test="event-card__message"]')

	// Assert that there are no longer messages in the inbox
	test.is(messages.length, 0)
})

ava.serial('Users should be able to create private conversations', async (test) => {
	const {
		user1,
		page,
		user2,
		incognitoPage
	} = context

	const rootUrl = `http://localhost:${environment.ui.port}/`

	// Clean up the URL
	await page.goto(rootUrl)

	const anticipatedSlug = `view-121-${user2.slug}-${user1.slug}`

	// First check that user1 can create a private conversation view with user2
	await macros.waitForThenClickSelector(page, '[data-test="create-private-conversation"]')
	await page.waitForSelector('[data-test="private-conversation-search-input"]')
	await macros.setInputValue(page, '[data-test="private-conversation-search-input"]', user2.slug)
	await macros.waitForThenClickSelector(page, `[data-test="private-conversation-${user2.slug}"]`)
	await page.waitForSelector(`.column--${anticipatedSlug}`)

	// Make sure the view is also accessible for user2
	await incognitoPage.goto(`${rootUrl}${anticipatedSlug}`)
	await incognitoPage.waitForSelector(`.column--${anticipatedSlug}`)

	// Check that a thread created from this view is also private
	await macros.waitForThenClickSelector(page, '.btn--add-thread')
	await page.waitForSelector('.column--thread')

	const rand = uuid()

	await page.waitForSelector('.new-message-input')
	await macros.createChatMessage(page, '.column--thread', rand)

	const [ viewSlug, threadSlug ] = page.url().replace(rootUrl, '').split('/')

	const view = await context.jellyfish.getCardBySlug(
		context.context,
		context.session,
		viewSlug
	)
	const thread = await context.jellyfish.getCardBySlug(
		context.context,
		context.session,
		threadSlug
	)

	test.deepEqual(view.markers, [
		`${user2.slug}+${user1.slug}`
	])

	test.deepEqual(thread.markers, [
		`${user2.slug}+${user1.slug}`
	])

	test.pass()
})
