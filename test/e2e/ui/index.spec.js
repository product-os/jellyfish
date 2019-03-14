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

const users = {
	community: {
		username: `johndoe-${randomstring.generate().toLowerCase()}`,
		email: `johndoe-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${randomstring.generate().toLowerCase()}`,
		email: `janedoe-${randomstring.generate().toLowerCase()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${randomstring.generate().toLowerCase()}`,
		email: `team-admin-${randomstring.generate().toLowerCase()}@example.com`,
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
		page,
		server
	} = context

	await context.createUser(users.community)

	await page.goto(`http://localhost:${server.port}`)

	await page.waitForSelector('.login-page', WAIT_OPTS)

	await page.type('.login-page__input--username', users.community.username)
	await page.type('.login-page__input--password', users.community.password)

	await page.click('.login-page__submit--login')

	await page.waitForSelector('.home-channel', WAIT_OPTS)

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

	await macros.waitForThenClickSelector(page, '.home-channel__group-toggle--org-balena')
	await macros.waitForThenClickSelector(page, '.home-channel__item--view-all-support-issues')
	await page.waitForSelector('.column--view-all-support-issues')
	await macros.waitForThenClickSelector(page, '.btn--add-support-issue')

	await page.waitForSelector('.rendition-form__field--root_name', WAIT_OPTS)
	await macros.setInputValue(
		page,
		'.rendition-form__field--root_name input',
		`Test support issue ${randomstring.generate()}`
	)

	// Submit the form
	await page.click('.card-create-modal__submit')

	await page.waitForSelector('.column--support-issue')

	const messageText = `My new message: ${randomstring.generate()}`

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
