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

ava.serial('Should be able to save a new view', async (test) => {
	const {
		page
	} = context

	const name = `test-view-${uuid()}`

	const user = await context.createUser(userDetails)
	await context.addUserToBalenaOrg(user.id)

	await macros.loginUser(page, userDetails)

	// Navigate to the all messages view
	await page.goto(`http://localhost:${environment.ui.port}/#/view~view-all-messages`)

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-messages"]')

	await page.waitForSelector('.column--view-all-messages')

	await macros.waitForThenClickSelector(page, '[data-test="filters__add-filter"]')

	await page.waitForSelector('[data-test="filters__filter-edit-form"] input')

	await macros.setInputValue(page, '[data-test="filters__filter-edit-form"] input', 'foobar')
	await macros.waitForThenClickSelector(page, '[data-test="filters__save-filter"]')
	await macros.waitForThenClickSelector(page, '[data-test="filters__open-save-view-modal"]')
	await macros.setInputValue(page, '[data-test="filters__save-view-name"]', name)
	await macros.waitForThenClickSelector(page, '[data-test="filters__save-view"]')

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--__myViews"]')
	await macros.waitForThenClickSelector(page, `[data-test*="${name}"]`)

	test.pass()
})
