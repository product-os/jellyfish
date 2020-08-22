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
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('Should be able to navigate to chart lens of pull requests', async (test) => {
	const {
		page
	} = context

	console.log(`PR: Node Version: ${process.version}`)
	// eslint-disable-next-line max-statements-per-line
	page.on('console', (msg) => { console.log('PAGE LOG:', msg.text()) })
	const pullRequest = require('./fixtures/pull-requests.json')
	try {
		const card = await page.evaluate((data) => {
			return window.sdk.card.create({
				type: 'pull-request@1.0.0',
				data
			})
		}, pullRequest)
		console.log(card.slug)
	} catch (err) {
		console.log(`Pull Requests Test error: ${err}`)
		test.fail()
	}

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__item--view-all-pull-requests"]'
	])

	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-chart"]')
	await page.waitForSelector('.plotly')
	test.pass()
})
