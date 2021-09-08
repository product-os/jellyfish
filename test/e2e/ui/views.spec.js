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

	const userCard = await context.createUser(user)
	await context.addUserToBalenaOrg(userCard.id)
	await macros.loginUser(context.page, user)
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

ava.serial('the filter summary displays the search term correctly', async (test) => {
	const {
		page,
		sdk
	} = context
	const device = `device-${uuid()}`
	const searchTerm = 'test'
	const searchInputSelector = '.view__search input'
	const filterButtonText = `Any field contains ${searchTerm}`
	const clearAllButtonSelector = '//*[@data-test="view__filters-summary-wrapper"]//button[contains(., "Clear all")]'
	const filterButtonSelector = `//*[@data-test="view__filters-summary-wrapper"]//button[contains(., "${filterButtonText}")]`
	const closeFilterButtonSelector = `${filterButtonSelector}/following-sibling::button`
	const scrollableSelector = '.column--view-all-opportunities .ReactVirtualized__Grid.ReactVirtualized__List'

	const account = await sdk.card.create({
		type: 'account@1.0.0',
		name: `account-${uuid()}`,
		data: {
			type: 'Lead'
		}
	})

	const opportunity = await sdk.card.create({
		type: 'opportunity@1.0.0',
		data: {
			device,
			status: 'Created'
		}
	})

	await sdk.card.link(opportunity, account, 'is attached to')

	const opportunityCardSelector = `[data-test-id="snippet-card-${opportunity.id}"]`

	await macros.goto(page, '/view-all-opportunities')
	await macros.waitForThenClickSelector(page, '[data-test="lens-selector--lens-list"]')
	await page.waitForSelector('.view__search')

	// The created opportunity is displayed as we have no active filter
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Enter a search term
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary
	await page.waitForXPath(filterButtonSelector)

	// The created opportunity should now be hidden as it doesn't match the search term
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollableToDisappear(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Click the 'x' button next to the search filter summary item to remove the search filter
	const closeButton = await page.waitForXPath(closeFilterButtonSelector)
	await closeButton.click()

	// The search term has now been cleared from the search input
	let searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// Enter the search term again
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary again
	await page.waitForXPath(filterButtonSelector)

	// ... and that the created opportunity should be hidden again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollableToDisappear(
		page,
		scrollableSelector,
		opportunityCardSelector
	))

	// This time click the 'Clear all' button to remove all filters
	const clearAllButton = await page.waitForXPath(clearAllButtonSelector)
	await clearAllButton.click()

	// The search term has been cleared again from the search input
	searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await test.notThrowsAsync(macros.waitForSelectorInsideScrollable(
		page,
		scrollableSelector,
		opportunityCardSelector
	))
})
