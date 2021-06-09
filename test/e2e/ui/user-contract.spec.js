/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
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
	context.balenaOrg = await context.sdk.card.get('org-balena')
	await context.page.goto(`${environment.ui.host}:${environment.ui.port}/user-${user.username}`)
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

ava.serial('A user\'s linked organization can be viewed on the links tab', async (test) => {
	const {
		page,
		balenaOrg
	} = context

	// Open the Links tab drop-down
	await macros.waitForThenClickSelector(page, '[data-test="reltab_value"]')
	await page.waitForSelector('[data-test="reltab_option"]')
	let linkOptions = await page.$$('[data-test="reltab_option"]')
	test.true(linkOptions.length > 1)

	// Search for 'Orgs'
	await macros.setInputValue(page, 'input[placeholder="Search for links..."]', 'Orgs')

	// Now there should only be one item in the list
	await macros.waitForSelectorToDisappear(page, '[data-test="reltab_option"][data-test-id="owns-account"]')
	linkOptions = await page.$$('[data-test="reltab_option"]')
	test.is(linkOptions.length, 1)

	// Select that option
	await macros.waitForThenClickSelector(
		page,
		'[data-test="reltab_option"][data-test-id="is-member-of-org"][data-test-count="1"]'
	)

	// The selected link option is displayed in the tab title
	const linkLabel = await macros.getElementText(page, '[data-test="reltab_value"]')
	test.is(linkLabel, 'Orgs (1)')

	// ...and the linked organization is rendered in the tab content
	await page.waitForSelector(`[data-test-id="snippet-card-${balenaOrg.id}"]`)
})
