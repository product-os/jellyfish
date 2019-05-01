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

	const userCard = await context.createUser(user)
	await context.addUserToBalenaOrg(userCard.id)
	await macros.loginUser(context.page, user)
	const card = await context.insertCard({
		slug: `thread-${uuid()}`,
		type: 'thread'
	})
	context.testCard = card
	await context.page.goto(
		`http://localhost:${environment.ui.port}/#/${card.type}~${card.id}`)
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

ava.serial('should let users delete a card', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="card-action-menu__delete"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-delete__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	test.pass()
})
