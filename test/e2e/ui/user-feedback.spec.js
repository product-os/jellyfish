/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
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

const user = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

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

ava.serial('Should be able to navigate to a user\'s feedback and show the user\'s answers', async (test) => {
	const {
		page
	} = context

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--User Feedback"]',
		'[data-test="home-channel__item--view-all-users-feedback"]'
	])

	await page.waitForSelector('.column--view-all-users-feedback')

	const mockData = require('./fixtures/user-feedback.json')
	const userFeedback = await page.evaluate((data) => {
		return window.sdk.card.create({
			type: 'user-feedback@1.0.0',
			data
		})
	}, mockData)

	const snippetSelector = `[data-test-id="snippet-form-response-${userFeedback.id}"] > div > a`
	await macros.waitForThenClickSelector(page, snippetSelector)
	const columnSelector = '.column--user-feedback'
	const innerText = await macros.getElementText(page, columnSelector)
	_.forEach(_.flatten(_.values(mockData)), (response) => {
		if (!innerText.includes(response)) {
			test.fail()
		}
	})
	test.pass()
})
