const {
	test
} = require('@playwright/test')
const path = require('path')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')

let sdk = {}
let user = {}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	}
}

const login = async (page, details) => {
	await page.goto('/')
	await page.type('.login-page__input--username', details.username)
	await page.type('.login-page__input--password', details.password)
	await page.click('.login-page__submit--login')
	await page.waitForSelector('.home-channel')
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await helpers.createUser(sdk, users.community)
	await helpers.addUserToBalenaOrg(sdk, user.id)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})
test.describe('File Upload', () => {
	test('Users should be able to upload an image', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.slug}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles(
			'input[type="file"]',
			path.join(__dirname, 'assets', 'test.png')
		)
		await page.waitForSelector(
			'.column--thread [data-test="event-card__image"]'
		)
	})

	test('Users should be able to upload an image to a support thread', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'support-thread@1.0.0',
				data: {
					status: 'open'
				}
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles(
			'input[type="file"]',
			path.join(__dirname, 'assets', 'test.png')
		)
		await page.waitForSelector(
			'.column--support-thread [data-test="event-card__image"]'
		)
	})

	test('Users should be able to upload a text file', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles(
			'input[type="file"]',
			path.join(__dirname, 'assets', 'test.txt')
		)
		await page.waitForSelector(
			'.column--thread [data-test="event-card__file"]'
		)
	})

	test('Users should be able to upload a text file to a support thread', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'support-thread@1.0.0',
				data: {
					status: 'open'
				}
			})
		})

		// Navigate to thread and upload file
		await page.goto(`/${thread.id}`)
		await page.locator('[data-test="timeline-tab"]').click()
		await page.setInputFiles(
			'input[type="file"]',
			path.join(__dirname, 'assets', 'test.txt')
		)
		await page.waitForSelector(
			'.column--support-thread [data-test="event-card__file"]'
		)
	})
})
