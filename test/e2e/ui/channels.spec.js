/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const macros = require('./macros')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const user = helpers.generateUserDetails()

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	context.communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(context.communityUser.id)
	await macros.loginUser(context.page, user)
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	await helpers.after({
		context
	})
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('User Feedback channel views are present in the UI', async (test) => {
	const {
		page
	} = context

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--User Feedback"]',
		'[data-test="home-channel__item--view-all-user-feedback"]'
	])

	await page.waitForSelector('.column--view-all-user-feedback')

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--User Feedback"]',
		'[data-test="home-channel__item--view-unowned-user-feedback"]'
	])

	await page.waitForSelector('.column--view-unowned-user-feedback')

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--User Feedback"]',
		'[data-test="home-channel__item--view-user-feedback-owned-by-me"]'
	])

	await page.waitForSelector('.column--view-user-feedback-owned-by-me')

	test.pass()
})
