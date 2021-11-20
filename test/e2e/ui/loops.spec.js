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

const user = helpers.generateUserDetails()

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

const setLoop = async (sdk, viewSlug, versionedLoopSlug) => {
	const {
		id, type
	} = await sdk.card.get(viewSlug)
	return sdk.card.update(id, type, [ {
		op: 'replace',
		path: '/loop',
		value: versionedLoopSlug
	} ])
}

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	context.communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(context.communityUser.id)
	await macros.loginUser(context.page, user)

	context.loop1 = await context.sdk.card.get('loop-product-os')
	context.loop2 = await context.sdk.card.get('loop-balena-io')

	// Update some of the views to belong to specific loops
	await setLoop(context.sdk, 'view-all-blog-posts', `${context.loop1.slug}@${context.loop1.version}`)
	await setLoop(context.sdk, 'view-all-faqs', `${context.loop2.slug}@${context.loop2.version}`)

	// Navigate to the home page again (to force the sidebar views to be refreshed)
	await macros.goto(context.page, '/')

	// Open up the balena sidebar menu section
	await macros.navigateToHomeChannelItem(context.page, [
		'[data-test="home-channel__group-toggle--org-balena"]'
	])
})

ava.serial.afterEach.always(async (test) => {
	await helpers.afterEach({
		context, test
	})
})

ava.serial.after.always(async () => {
	// Reset the loops on the views
	await setLoop(context.sdk, 'view-all-blog-posts', null)
	await setLoop(context.sdk, 'view-all-faqs', null)

	await helpers.after({
		context
	})
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('When "All loops" is selected, views in all loops are displayed in the sidebar', async (test) => {
	const {
		page
	} = context

	const loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	test.is(loopDisplayText, 'All loops')

	// Both the loop-specific views should be visible
	await page.waitForSelector(selectors.viewBlogPosts)
	await page.waitForSelector(selectors.viewFaqs)
})

ava.serial('When a loop is selected, only views in that loops are displayed in the sidebar', async (test) => {
	const {
		page,
		loop1,
		loop2
	} = context

	let loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	test.is(loopDisplayText, 'All loops')

	// Select loop1 from the Loop Selector
	await macros.waitForThenClickSelector(page, selectors.loopSelect)
	await macros.waitForThenClickSelector(page, selectors.loopSelectOption(loop1))

	// Verify that loop1 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)
	loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	test.is(loopDisplayText, loop1.name)

	// And wait for the view in loop2 to disappear
	await macros.waitForSelectorToDisappear(page, selectors.viewFaqs)

	// Check that the view in loop1 is still there
	await page.waitForSelector(selectors.viewBlogPosts)

	// Now select loop2 from the Loop Selector
	await macros.waitForThenClickSelector(page, selectors.loopSelect)
	await macros.waitForThenClickSelector(page, selectors.loopSelectOption(loop2))

	// Verify that loop2 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop2), macros.WAIT_OPTS)
	loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	test.is(loopDisplayText, loop2.name)

	// And wait for the view in loop1 to disappear
	await macros.waitForSelectorToDisappear(page, selectors.viewBlogPosts)

	// Check that the view in loop2 is still there
	await page.waitForSelector(selectors.viewFaqs)
})

ava.serial('The selected loop is persisted and selected next time Jellyfish is loaded', async (test) => {
	const {
		page,
		loop1
	} = context

	// Select loop1 from the Loop Selector
	await macros.waitForThenClickSelector(page, selectors.loopSelect)
	await macros.waitForThenClickSelector(page, selectors.loopSelectOption(loop1))

	// Verify that loop1 is now selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)

	// Refresh the page
	await macros.goto(page, '/')

	// Verify that loop1 is still selected in the loop selector
	await page.waitForSelector(selectors.loopSelectValue(loop1), macros.WAIT_OPTS)
	const loopDisplayText = await macros.getElementText(page, selectors.loopSelect)
	test.is(loopDisplayText, loop1.name)
})
