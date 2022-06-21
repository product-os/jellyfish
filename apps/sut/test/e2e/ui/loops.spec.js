const {
	test, expect
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const serverHelpers = require('../server/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

const user = serverHelpers.generateUserDetails()
let sdk = {}
let communityUser = {}
let loop1 = {}
let loop2 = {}

const selectors = {
	loopSelect: '#loopselector__select',
	loopDropdown: '#loopselector__select__select-drop>div',
	loopSelectOption: (loop) => {
		return `[data-test="loop-option--${loop.slug}"]`
	},
	loopSelectValue: (loop) => {
		return `#loopselector__select [data-test="loop-option--${loop.slug}"]`
	},
	viewBlogPosts: '[data-test="home-channel__item--view-all-blog-posts"]',
	viewFaqs: '[data-test="home-channel__item--view-all-faqs"]'
}

const setLoop = async (viewSlug, versionedLoopSlug) => {
	const {
		id, type
	} = await sdk.card.get(viewSlug)
	return sdk.card.update(id, type, [ {
		op: 'replace',
		path: '/loop',
		value: versionedLoopSlug
	} ])
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	communityUser = await helpers.createUser(sdk, user)
	await helpers.addUserToBalenaOrg(sdk, communityUser.id)

	loop1 = await sdk.card.get('loop-product-os')
	loop2 = await sdk.card.get('loop-balena-io')

	// Update some of the views to belong to specific loops
	await setLoop('view-all-blog-posts', `${loop1.slug}@${loop1.version}`)
	await setLoop('view-all-faqs', `${loop2.slug}@${loop2.version}`)
})

test.beforeEach(async ({
	page
}) => {
	await macros.loginUser(page, user)

	// Navigate to the home page again (to force the sidebar views to be refreshed)
	await page.goto('/')

	// Open up the balena sidebar menu section
	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]'
	])
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test.afterAll(async () => {
	// Reset the loops on the views
	await setLoop('view-all-blog-posts', null)
	await setLoop('view-all-faqs', null)
})

test('When "All loops" is selected, views in all loops are displayed in the sidebar', async ({
	page
}) => {
	const loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	expect(loopDisplayText).toEqual('All loops')

	// Both the loop-specific views should be visible
	await page.waitForSelector(selectors.viewBlogPosts)
	await page.waitForSelector(selectors.viewFaqs)
})

test('When a loop is selected, only views in that loops are displayed in the sidebar', async ({
	page
}) => {
	let loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	expect(loopDisplayText).toEqual('All loops')

	// Select loop1 from the Loop Selector
	await page.locator(selectors.loopSelect).click()
	await page.locator(selectors.loopSelectOption(loop1)).click()

	// Verify that loop1 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)
	loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	expect(loopDisplayText).toEqual(loop1.name)

	// And wait for the view in loop2 to disappear
	await macros.waitForSelectorToDisappear(page, selectors.viewFaqs)

	// Check that the view in loop1 is still there
	await page.waitForSelector(selectors.viewBlogPosts)

	// Now select loop2 from the Loop Selector
	await page.locator(selectors.loopSelect).click()
	await page.locator(selectors.loopSelectOption(loop2)).click()

	// Verify that loop2 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop2), macros.WAIT_OPTS)
	loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	expect(loopDisplayText).toEqual(loop2.name)

	// And wait for the view in loop1 to disappear
	await macros.waitForSelectorToDisappear(page, selectors.viewBlogPosts)

	// Check that the view in loop2 is still there
	await page.waitForSelector(selectors.viewFaqs)
})

test('The selected loop is persisted and selected next time Jellyfish is loaded', async ({
	page
}) => {
	// Select loop1 from the Loop Selector
	await page.locator(selectors.loopSelect).click()
	await page.locator(selectors.loopSelectOption(loop1)).click()

	// Verify that loop1 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)

	// Refresh the page
	await page.goto('/')

	// Verify that loop1 is still selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)
	const loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	expect(loopDisplayText).toEqual(loop1.name)
})
