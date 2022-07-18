const {
	test
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const serverHelpers = require('../server/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

const user = serverHelpers.generateUserDetails()
let sdk = {}
let communityUser = {}
let loop1 = {}

const selectors = {
	loopSelect: '#loopselector__select',
	loopSelectOption: (loop) => {
		return `[id^="react-select-2-option"]:text("${
			loop.name || loop.slug.replace('loop-', '')
		}")`
	},
	loopSelectValue: (loop) => {
		return `#loopselector__select :text("${
			loop.name || loop.slug.replace('loop-', '')
		}")`
	}
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	communityUser = await helpers.createUser(sdk, user)
	await helpers.addUserToBalenaOrg(sdk, communityUser.id)

	loop1 = await sdk.card.get('loop-product-os')
})

test.beforeEach(async ({
	page
}) => {
	await macros.loginUser(page, user)

	// Navigate to the home page again (to force the sidebar views to be refreshed)
	await page.goto('/')
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test('When a loop is selected, the app navigates to that loop', async ({
	page
}) => {
	// Select loop1 from the Loop Selector
	await page.locator(selectors.loopSelect).click()
	await page.locator(selectors.loopSelectOption(loop1)).click()

	// Wait for the loop to be loaded
	await page.waitForSelector(`.column--slug-${loop1.slug}`)
})

test('The selected loop is persisted and selected next time Jellyfish is loaded', async ({
	page
}) => {
	// Select loop1 from the Loop Selector
	await page.locator(selectors.loopSelect).click()
	await page.locator(selectors.loopSelectOption(loop1)).click()

	// Refresh the page
	await page.reload()

	// Verify that loop1 is still selected in the loop selector
	await page.waitForSelector(
		selectors.loopSelectValue(loop1),
		macros.WAIT_OPTS
	)
})
