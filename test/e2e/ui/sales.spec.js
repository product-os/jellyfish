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
const Bluebird = require('bluebird')
const environment = require('@balena/jellyfish-environment')

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
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('should let users create new accounts', async (test) => {
	const {
		page
	} = context

	await macros.navigateToHomeChannelItem(page, [
		'[data-test="home-channel__group-toggle--org-balena"]',
		'[data-test="home-channel__group-toggle--Sales"]',
		'[data-test="home-channel__item--view-all-customers"]'
	])

	await macros.waitForThenClickSelector(page, '.btn--add-account')

	const name = `test account ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--account')

	test.pass()
})

ava.serial('should let users create new contacts attached to accounts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[role="tablist"] button:nth-of-type(4)')
	await macros.waitForThenClickSelector(page, '[data-test="add-contact"]')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'success')

	const results = await page.evaluate((nameParam) => {
		return window.sdk.query({
			$$links: {
				'is member of': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					const: 'contact@1.0.0'
				},
				links: {
					type: 'object'
				},
				name: {
					const: nameParam
				}
			}
		}, {
			limit: 1
		})
	}, name)

	test.is(results[0].links['is member of'].length, 1)
})

ava.serial('should let users create new contacts', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-contacts"]')
	await macros.waitForThenClickSelector(page, '.btn--add-contact')

	const name = `test contact ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--contact')

	test.pass()
})

ava.serial('should let users create new opportunities', async (test) => {
	const {
		page
	} = context

	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-opportunities"]')
	await macros.waitForThenClickSelector(page, '.btn--add-opportunity')

	const name = `test opportunity ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	await page.waitForSelector('.column--opportunity')

	test.pass()
})

ava.serial('should let users create new opportunities and directly link existing account', async (test) => {
	const {
		page
	} = context

	// Navigate to view all opportunities
	await macros.waitForThenClickSelector(page, '[data-test="home-channel__item--view-all-opportunities"]')

	// Open CreateLens for opportunities
	await macros.waitForThenClickSelector(page, '.btn--add-opportunity')

	const name = `test opportunity ${uuid()}`

	await page.waitForSelector('#root_name')

	await macros.setInputValue(page, '#root_name', name)

	// Create new Link to Account
	await macros.waitForThenClickSelector(page, '[data-test="link-to-account"]')
	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"]')
	await page.type('.jellyfish-async-select__input input', 'test')
	await page.waitForSelector('.jellyfish-async-select__option--is-focused')
	await page.keyboard.press('Enter')
	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__submit"]:not(:disabled)')

	await page.waitForSelector('[data-test="segment-card--account"] [data-test-component="card-chat-summary"]')

	// Submit CreateLens
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

	// Wait for the success alert as a heuristic for the action completing
	// successfully
	await macros.waitForThenDismissAlert(page, 'success')

	// We wait for the db to catch up on the linking
	await Bluebird.delay(1000)

	// Check if new Opportunity is Linked
	const results = await page.evaluate((nameParam) => {
		console.log('nameParam', nameParam)
		return window.sdk.query({
			$$links: {
				'is attached to': {
					type: 'object'
				}
			},
			type: 'object',
			properties: {
				type: {
					enum: [ 'opportunity', 'opportunity@1.0.0' ]
				},
				links: {
					type: 'object'
				},
				name: {
					const: nameParam
				}
			}
		}, {
			limit: 1
		})
	}, name)

	test.is(results[0].links['is attached to'].length, 1)
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

	await page.goto(`${environment.ui.host}:${environment.ui.port}/view-all-opportunities`)
	await page.waitForSelector('.view__search')

	// The created opportunity is displayed as we have no active filter
	await page.waitForSelector(opportunityCardSelector)

	// Enter a search term
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary
	await page.waitForXPath(filterButtonSelector)

	// The created opportunity should now be hidden as it doesn't match the search term
	await macros.waitForSelectorToDisappear(page, opportunityCardSelector)

	// Click the 'x' button next to the search filter summary item to remove the search filter
	const closeButton = await page.waitForXPath(closeFilterButtonSelector)
	await closeButton.click()

	// The search term has now been cleared from the search input
	let searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await page.waitForSelector(opportunityCardSelector)

	// Enter the search term again
	await macros.setInputValue(page, searchInputSelector, searchTerm)

	// Check that the search term appears in the filters summary again
	await page.waitForXPath(filterButtonSelector)

	// ... and that the created opportunity should be hidden again
	await macros.waitForSelectorToDisappear(page, opportunityCardSelector)

	// This time click the 'Clear all' button to remove all filters
	const clearAllButton = await page.waitForXPath(clearAllButtonSelector)
	await clearAllButton.click()

	// The search term has been cleared again from the search input
	searchText = await macros.getElementText(page, searchInputSelector)
	test.is(searchText.trim(), '')

	// ...and the created opportunity is displayed once again
	await page.waitForSelector(opportunityCardSelector)
})
