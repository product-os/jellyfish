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
	const name = `Feedback from ${mockData.user}`
	const userFeedback = await page.evaluate((data, nameField) => {
		return window.sdk.card.create({
			type: 'user-feedback@1.0.0',
			name: nameField,
			data
		})
	}, mockData, name)

	const snippetSelector = `[data-test-id="snippet-card-${userFeedback.id}"] div > a`
	await macros.waitForThenClickSelector(page, snippetSelector)
	const linkText = await macros.getElementText(page, snippetSelector)
	test.true(linkText.includes(name))
})
