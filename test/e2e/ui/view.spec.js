const {
	test
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
test.describe('Views', () => {
	test.skip('Should be able to save a new view', async ({
		page
	}) => {
		await login(page, users.community)
		const name = `test-view-${uuid()}`

		// Navigate to the all messages view
		await page.goto('/view-all-messages')
		await page.waitForSelector('.column--view-all-messages')
		await page.locator('[data-test="filters__add-filter"]').click()
		await page.waitForSelector('[data-test="filters__filter-edit-form"] input')
		await macros.setInputValue(
			page,
			'[data-test="filters__filter-edit-form"] input',
			'foobar'
		)
		await page.locator('[data-test="filters__save-filter"]').click()
		await page.locator('[data-test="filters__open-save-view-modal"]').click()
		await macros.setInputValue(
			page,
			'[data-test="filters__save-view-name"]',
			name
		)
		await page.locator('[data-test="filters__save-view"]').click()
		await page
			.locator('[data-test="home-channel__group-toggle--__myViews"]')
			.click()
		await page.locator(`[data-test*="${name}"]`).click()
	})
})
