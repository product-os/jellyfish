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

const WAIT_OPTS = {
	timeout: 180 * 1000
}

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`
	}
}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${uuid()}`,
		email: `janedoe-${uuid()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${uuid()}`,
		email: `team-admin-${uuid()}@example.com`,
		password: 'password'
	}
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

ava.serial('should let users login', async (test) => {
	const {
		page
	} = context

	await context.createUser(users.community)

	await macros.loginUser(page, users.community)

	test.pass()
})

ava.serial('should stop users from seeing messages attached to cards they can\'t view', async (test) => {
	const {
		page
	} = context

	const communityUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	await context.addUserToBalenaOrg(communityUser.id)
	await page.reload()

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Support"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-support-issues"]')
	await page.waitForSelector('.column--view-all-support-issues')
	await macros.waitForThenClickSelector(page, '.btn--add-support-issue')

	await page.waitForSelector('.rendition-form__field--root_name', WAIT_OPTS)
	await macros.setInputValue(
		page,
		'.rendition-form__field--root_name input',
		`Test support issue ${uuid()}`
	)

	// Submit the form
	await page.waitForSelector('[data-test="card-creator__submit"]:not([disabled])')
	await page.click('[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--support-issue')

	const messageText = `My new message: ${uuid()}`

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(2)')
	await macros.createChatMessage(page, '.column--support-issue', messageText)

	// This reload checks that authorisation persists between reloads and tha the
	// app will correctly bootstrap based on the URL
	await page.reload()
	await page.waitForSelector('.column--support-issue')

	// Wait for a small delay then check again, this means the test will fail if
	// there is a render issue in a subcomponent
	await Bluebird.delay(500)
	await page.waitForSelector('.column--support-issue')

	await macros.logout(page)

	await context.createUser(users.community2)

	const lastMessage = await page.evaluate((text) => {
		return window.sdk.query({
			type: 'object',
			properties: {
				type: {
					const: 'message',
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						payload: {
							type: 'object',
							properties: {
								message: {
									type: 'string',
									pattern: text
								}
							},
							required: [ 'message' ]
						}
					},
					required: [ 'payload' ]
				}
			},
			required: [ 'type', 'data' ]
		})
	}, messageText)

	test.not(messageText, lastMessage)
})
