/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const bluebird = require('bluebird')
const uuid = require('uuid/v4')
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

ava.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const userCard = await context.createUser(user)
	await context.addUserToBalenaOrg(userCard.id)
	await macros.loginUser(context.page, user)
})

ava.after(async () => {
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
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--account')

	test.pass()
})

ava.serial('should let users create new contacts attached to accounts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(2)')
	await macros.waitForThenClickSelector(page, '[data-test="add-contact"]')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await bluebird.delay(1000)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await page.waitForSelector('[data-test="alert--success"]')

	const results = await page.evaluate((nameParam) => {
		return window.sdk.query({
			$$links: {
				'is member of account': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					const: 'contact'
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

	test.is(results[0].links['is member of account'].length, 1)
})
