/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const randomstring = require('randomstring')
const helpers = require('./helpers')
const macros = require('./macros')

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${randomstring.generate(20)}`
	}
}

// Useful for debugging failed tests
// eslint-disable-next-line
const screenshot = async (test, page) => {
	test.context.screenshots = (test.context.screenshots || 0) + 1
	const dir = '/tmp/test-results/screenshots'
	const file = `${test.title}.${test.context.screenshots}.png`
	const path = `${dir}/${file}`
	await page.screenshot({
		path
	})
	console.log(`Saved screenshot: ${file}`)
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

	const userCard = await context.createUser(user)
	await context.addUserToBalenaOrg(userCard.id)
	await macros.loginUser(context.page, user)
	const card = await context.insertCard({
		slug: `thread-${randomstring.generate().toLowerCase()}`,
		type: 'thread'
	})
	context.testCard = card
	await context.page.goto(`http://localhost:8000/#/${card.type}~${card.id}`)
	await context.page.waitForSelector('.column--thread')
})

ava.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('should let users copy a working permalink', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__permalink"]')

	const permalink = await page.evaluate(() => {
		return window.navigator.clipboard.readText()
	})

	await page.goto(permalink)
	await page.reload()
	await context.page.waitForSelector('.column--thread')

	test.pass()
})

ava.serial('should let users copy a card as JSON', async (test) => {
	const {
		page,
		testCard
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu"]')
	console.log('clicked selector, menu')
	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__json"]')
	console.log('clicked selector, json')

	const copiedJSON = await page.evaluate(() => {
		return window.navigator.clipboard.readText()
	})

	test.deepEqual(testCard, JSON.parse(copiedJSON))
})
