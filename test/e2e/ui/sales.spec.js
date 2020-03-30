/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const macros = require('./macros')
const Bluebird = require('bluebird')

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

	const userCard = await context.createUser(user)
	await context.addUserToBalenaOrg(userCard.id)
	await macros.loginUser(context.page, user)
})

ava.serial.after(async () => {
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('should let users create new accounts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--org-balena"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__group-toggle--Sales"]')
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-customers"]')
	await macros.waitForThenClickSelector(page, '.btn--add-account')

	const name = `test account ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--account')

	test.pass()
})

ava.serial('should let users create new contacts attached to accounts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(4)')
	await macros.waitForThenClickSelector(page, '[data-test="add-contact"]')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	const results = await page.evaluate((nameParam) => {
		return window.sdk.query({
			$$links: {
				'is member of': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					const: 'contact@1.0.0'
				},
				links: {
					type: 'object'
				},
				name: {
					const: nameParam
				}
			}
		}, {
			limit: 1
		})
	}, name)

	test.is(results[0].links['is member of'].length, 1)
})

ava.serial('should let users create new contacts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-contacts"]')
	await macros.waitForThenClickSelector(page, '.btn--add-contact')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--contact')

	test.pass()
})

ava.serial('should let users create new opportunities', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-opportunities"]')
	await macros.waitForThenClickSelector(page, '.btn--add-opportunity')

	const name = `test opportunity ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--opportunity')

	test.pass()
})

ava.serial('should let users create new opportunities and directly link existing account', async (test) => {
	const {
		page
	} = context

	// Navigate to view all opportunities
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-opportunities"]')

	// Open CreateLens for opportunities
	await macros.waitForThenClickSelector(page, '.btn--add-opportunity')

	const name = `test opportunity ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)

	// Create new Link to Account
	await macros.waitForThenClickSelector(page, '[data-test="link-to-account"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"]')
	await page.type('.jellyfish-async-select__input input', 'test')
	await page.waitForSelector('.jellyfish-async-select__option--is-focused')
	await page.keyboard.press('Enter')
	await page.click('[data-test="card-linker--existing__submit"]')

	await page.waitForSelector('[data-test="segment-card--account"] [data-test-component="card-chat-summary"]')

	// Submit CreateLens
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	// We wait for the db to catch up on the linking
	await Bluebird.delay(1000)

	// Check if new Opportunity is Linked
	const results = await page.evaluate((nameParam) => {
		console.log('nameParam', nameParam)
		return window.sdk.query({
			$$links: {
				'is attached to': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					enum: [ 'opportunity', 'opportunity@1.0.0' ]
				},
				links: {
					type: 'object'
				},
				name: {
					const: nameParam
				}
			}
		}, {
			limit: 1
		})
	}, name)

	test.is(results[0].links['is attached to'].length, 1)
})
