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
const user = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	const communityUser = await helpers.createUser(sdk, user)
	await helpers.addUserToBalenaOrg(sdk, communityUser.id)
})

test.beforeEach(async ({
	page
}) => {
	await macros.loginUser(page, user)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test('Can link and unlink contracts through modal', async ({
	page
}) => {
	// Create support thread
	const supportThread = await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'support-thread@1.0.0',
			data: {
				inbox: 'S/Paid_Support',
				status: 'open'
			}
		})
	})

	// Create pattern
	const patternName = uuid().split('-')[0]
	await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'pattern@1.0.0',
			name,
			data: {
				status: 'open'
			}
		})
	}, patternName)

	// Open support thread
	await page.goto(`/${supportThread.id}`)

	// Link to pattern
	await page.locator('[data-test="card-linker-action"]').click()
	await page.locator('[data-test="card-linker-action--existing"]').click()
	await page.locator('//button[text()="Pattern"]').click()
	await page.locator('//div[contains(@class, "jellyfish-async-select__input")]/input').fill(patternName)
	await page.waitForSelector(`//div[contains(@class, "jellyfish-async-select__option")]/div/div[text()="${patternName}"]`)
	await page.keyboard.press('Enter')
	await page.locator('[data-test="card-linker--existing__submit"]').click()

	// Unlink from pattern
	await page.locator('[data-test="card-linker-action"]').click()
	await page.locator('[data-test="card-linker-action--unlink"]').click()
	await page.locator('//button[text()="Pattern"]').click()
	await page.locator('//div[contains(@class, "jellyfish-async-select__input")]/input').fill(patternName)
	await page.waitForSelector(`//div[contains(@class, "jellyfish-async-select__option")]/div/div[text()="${patternName}"]`)
	await page.keyboard.press('Enter')
	await page.locator('[data-test="card-unlinker__submit"]').click()
})
