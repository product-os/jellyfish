/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const path = require('path')
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

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

// If the current user is not the community user, logout, then login as the
// community user.
const ensureCommunityLogin = async (page) => {
	const baseURL = `${environment.ui.host}:${environment.ui.port}`

	if (!page.url().includes(baseURL)) {
		await page.goto(baseURL)
	}

	const currentUser = await page.evaluate(() => {
		return window.sdk.auth.whoami()
	})

	if (currentUser.slug !== `user-${users.community.username}`) {
		await macros.logout(page)
		await macros.loginUser(page, users.community)

		return page.evaluate(() => {
			return window.sdk.auth.whoami()
		})
	}

	return currentUser
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	const user = await context.createUser(users.community)
	await context.addUserToBalenaOrg(user.id)
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

ava.serial('files upload: Users should be able to upload an image', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector('.column--thread [data-test="event-card__image"]')

	test.pass()
})

ava.serial('file upload: Users should be able to upload an image to a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.png'))

	await page.waitForSelector(`${selector} [data-test="event-card__image"]`)

	test.pass()
})

ava.serial('file upload: Users should be able to upload a text file', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	await page.waitForSelector(`.column--slug-${thread.slug}`)

	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector('.column--thread [data-test="event-card__file"]')

	test.pass()
})

ava.serial('file upload: Users should be able to upload a text file to a support thread', async (test) => {
	const {
		page
	} = context

	await ensureCommunityLogin(page)

	// Create a new thread
	const thread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0'
		})
	})

	// Navigate to the user profile page
	await page.goto(`${environment.ui.host}:${environment.ui.port}/${thread.id}`)

	const selector = '.column--support-thread'

	await page.waitForSelector(selector)
	await page.waitForSelector('input[type="file"]')
	const input = await page.$('input[type="file"]')
	await input.uploadFile(path.join(__dirname, 'assets', 'test.txt'))

	await page.waitForSelector(`${selector} [data-test="event-card__file"]`)

	test.pass()
})
