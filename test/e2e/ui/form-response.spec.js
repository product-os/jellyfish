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
const environment = require('@balena/jellyfish-environment')
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

ava.serial('Should be able to navigate to a user\'s feedback and show the user\'s responses', async (test) => {
	const {
		page
	} = context

	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-typeform-responses`)

	await page.waitForSelector('.column--view-typeform-responses')

	// Create the form response for testing using ./assets/users-form-response.json
	const mockData = require('./fixtures/users-form-response.json')
	const formResponse = await page.evaluate((data) => {
		return window.sdk.card.create({
			type: 'form-response@1.0.0',
			data
		})
	}, mockData)

	const snippetSelector = `[data-test-id="snippet-form-response-${formResponse.id}"] > div > a`
	await macros.waitForThenClickSelector(page, snippetSelector)
	const columnSelector = '.column--form-response'
	const innerText = await macros.getElementText(page, columnSelector)
	_.forEach(mockData.responses, (response) => {
		if (!innerText.includes(response.question)) {
			test.fail()
		}
		if (!innerText.includes(response.answer.value)) {
			test.fail()
		}
	})
	test.pass()
})
