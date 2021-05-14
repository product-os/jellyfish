/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const macros = require('./macros')
const guidedFlowUtils = require('./guided-flow-utils')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`,
		summary: 'This is the problem and the solution'
	}
}

const selectors = {
	closeThreadBtn: '[data-test="support-thread__close-thread"]',
	archiveThreadBtn: '[data-test="support-thread__archive-thread"]',
	closedBadge: '.column--support-thread span[data-test="status-closed"]',
	addProductImprovement: '[data-test="add-product-improvement"]',
	linkProductImprovement: '[data-test="link-to-product-improvement"]',
	linkedProductImprovements: '[data-test="segment-card--product-improvements"] [data-test="snippet--card"]',
	summaryProductImprovements: '[data-test="summary--product-improvements"] ul li',
	summaryTextArea: '[data-test="gf__ta-summary"]',
	summary: '.event-card--summary [data-test="event-card__message"]'
}

const user = helpers.generateUserDetails()

ava.serial.before(async () => {
	await helpers.browser.beforeEach({
		context
	})

	// Create user and log in to the web browser client
	const communityUser = await context.createUser(user)
	await context.addUserToBalenaOrg(communityUser.id)
	await macros.loginUser(context.page, user)

	context.currentUser = await context.page.evaluate(() => {
		return window.sdk.auth.whoami()
	})
	context.currentUserSlug = context.currentUser.slug.replace('user-', '')
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

ava.serial('You can teardown a support thread following a specific flow', async (test) => {
	const {
		page,
		context: {
			summary
		}
	} = context

	const productImprovement1Name = `UI-INTEGRATION-TEST-PI-${uuid()}`
	const productImprovement2Name = `UI-INTEGRATION-TEST-PI-${uuid()}`

	// Create a product improvement that we'll link later on
	const productImprovement1 = await page.evaluate((name) => {
		return window.sdk.card.create({
			type: 'product-improvement@1.0.0',
			name,
			data: {
				phase: 'proposed',
				status: 'proposed'
			}
		})
	}, productImprovement1Name)

	// Create a new support thread
	await guidedFlowUtils.createSupportThreadAndNavigate(page)

	await page.waitForSelector('[data-test="support-thread__collapse-status"]')

	await Bluebird.delay(1000)

	await macros.waitForThenClickSelector(page, selectors.closeThreadBtn)

	// Enter a summary
	await page.waitForSelector(selectors.summaryTextArea)
	await page.type(selectors.summaryTextArea, summary)

	await guidedFlowUtils.nextStep(page)

	// Add a new Product Improvement
	await macros.waitForThenClickSelector(page, selectors.addProductImprovement)
	await page.waitForSelector('input#root_name')
	await page.type('input#root_name', productImprovement2Name)
	await macros.waitForThenClickSelector(page, '#root_data_status__input')
	await macros.waitForThenClickSelector(page, '#root_data_status__select-drop button')
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]:not(:disabled)')

	await page.waitForSelector(selectors.linkedProductImprovements)
	let linkedProductImprovements = await page.$$(selectors.linkedProductImprovements)
	test.is(linkedProductImprovements.length, 1)

	// Link to an existing Product Improvement
	await macros.waitForThenClickSelector(page, selectors.linkProductImprovement)
	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__input"]')
	await page.type('.jellyfish-async-select__input input', productImprovement1Name)
	await page.waitForSelector('.jellyfish-async-select__option--is-focused')
	await page.keyboard.press('Enter')
	await macros.waitForThenClickSelector(page, '[data-test="card-linker--existing__submit"]:not(:disabled)')

	const pi1CardChatSummary = `[data-test="snippet--card"][data-test-id="snippet-card-${productImprovement1.id}"]`
	await page.waitForSelector(`[data-test="segment-card--product-improvements"] ${pi1CardChatSummary}`)
	linkedProductImprovements = await page.$$(selectors.linkedProductImprovements)
	test.is(linkedProductImprovements.length, 2)

	// Rate
	await guidedFlowUtils.nextStep(page)
	await macros.waitForThenClickSelector(page, '#root_score > *:nth-child(3)')
	await page.click('#root_comment')
	await page.keyboard.type('Some comment')

	await guidedFlowUtils.nextStep(page)

	await page.waitForFunction((selector) => {
		return document.querySelectorAll(selector).length === 2
	}, {}, selectors.summaryProductImprovements)

	await guidedFlowUtils.action(page)

	// Check that the thread is now closed
	await page.waitForSelector(selectors.archiveThreadBtn)

	// Check the summary
	const summaryText = await macros.getElementText(page, selectors.summary)
	test.true(summaryText.includes(summary))

	// Check the rating
	const ratingText = await macros.getElementText(page, '.event-card--rating [data-test="event-card__message"]')
	test.is(ratingText, 'Review score: 3/5\nReview comment:\nSome comment')
})
