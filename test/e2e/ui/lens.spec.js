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

const userDetails = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

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

ava.serial('A lens selection should be remembered', async (test) => {
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

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')

	await page.waitForSelector('.column--view-all-support-threads')

	await page.click('[data-test="lens-selector--lens-support-threads"]')

	// TODO remove these screenshots once we are certain the flakiness is resolved
	await screenshot(test, page)
	await page.waitForSelector('[data-test="lens--lens-support-threads"]')

	await screenshot(test, page)

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-issues"]')
	await page.waitForSelector('.column--view-all-support-issues')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-threads"]')
	await page.waitForSelector('.column--view-all-support-threads')

	await screenshot(test, page)

	// Wait for a while as reload can take some time
	await page.waitForSelector('[data-test="lens--lens-support-threads"]', {
		timeout: 0
	})

	test.pass()
})
