const {
	test, expect
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

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
test.describe('User Profile', () => {
	test('The send command should default to "shift+enter"', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`)
		await page.waitForSelector('[data-test="lens--lens-my-user"]')
		await page
			.locator(
				'[data-test="lens--lens-my-user"] button.card-actions__btn--edit'
			)
			.click()
		await page.waitForSelector('[data-test="lens--edit-my-user"]')
		await page
			.locator(
				'[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)'
			)
			.click()
		await page.locator('button#root_profile_sendCommand').click()
		await page
			.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(1)')
			.click()
		await page.waitForSelector(
			'input#root_profile_sendCommand__input[value="shift+enter"]'
		)
		const value = await macros.getElementValue(
			page,
			'input#root_profile_sendCommand__input'
		)
		expect(value).toEqual('shift+enter')
		await page.locator('button[type="submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the updated setting is working
		await page
			.locator('.column--thread button[data-test="timeline-tab"]')
			.click()
		await page.type('textarea', uuid())
		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await page.keyboard.down('Shift')
		await page.keyboard.press('Enter')
		await page.keyboard.up('Shift')
		await page.waitForSelector(
			'.column--thread [data-test="event-card__message"]'
		)
	})

	test('You should be able to change the send command to "enter"', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a new thread
		const thread = await page.evaluate(() => {
			return window.sdk.card.create({
				type: 'thread@1.0.0'
			})
		})

		// Navigate to the user profile page and update settings
		await page.goto(`/${user.id}/${thread.id}`)
		await page.waitForSelector('[data-test="lens--lens-my-user"]')
		await page
			.locator(
				'[data-test="lens--lens-my-user"] button.card-actions__btn--edit'
			)
			.click()
		await page.waitForSelector('[data-test="lens--edit-my-user"]')
		await page
			.locator(
				'[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(3)'
			)
			.click()
		await page.locator('button#root_profile_sendCommand').click()
		await page
			.locator('[role="menubar"] > button[role="menuitem"]:nth-of-type(3)')
			.click()
		await page.waitForSelector(
			'input#root_profile_sendCommand__input[value="enter"]'
		)
		const value = await macros.getElementValue(
			page,
			'input#root_profile_sendCommand__input'
		)
		expect(value).toEqual('enter')
		await page.locator('button[type="submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the updated setting is working
		await page
			.locator('.column--thread button[data-test="timeline-tab"]')
			.click()
		await page.type('textarea', uuid())
		await new Promise((resolve) => {
			setTimeout(resolve, 500)
		})
		await page.keyboard.press('Enter')
		await page.waitForSelector(
			'.column--thread [data-test="event-card__message"]'
		)
	})
})
