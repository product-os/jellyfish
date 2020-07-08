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
const guidedFlowUtils = require('./guided-flow-utils')

const context = {
	context: {
		id: `UI-INTEGRATION-TEST-${uuid()}`,
		problem: 'This is the problem',
		solution: 'This is the solution'
	}
}

const selectors = {
	closeThreadBtn: '[data-test="support-thread__close-thread"]',
	archiveThreadBtn: '[data-test="support-thread__archive-thread"]',
	closedBadge: '.column--support-thread span[data-test="status-closed"]',
	addProductImprovement: '[data-test="add-product-improvement"]',
	linkProductImprovement: '[data-test="link-to-product-improvement"]',
	linkedProductImprovements: '[data-test="segment-card--product-improvements"] [data-test-component="card-chat-summary"]',
	summaryProductImprovements: '[data-test="summary--product-improvements"] ul li',
	problemTextArea: '[data-test="gf__ta-problem"]',
	solutionTextArea: '[data-test="gf__ta-solution"]',
	whisper: '.event-card--whisper [data-test="event-card__message"]'
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
	await helpers.browser.afterEach({
		context
	})
})

ava.serial('You can teardown a support thread following a specific flow', async (test) => {
	const {
		page,
		context: {
			problem,
			solution
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
				status: 'open'
			}
		})
	}, productImprovement1Name)

	// Create a new support thread
	await guidedFlowUtils.createSupportThreadAndNavigate(page)

	await macros.waitForThenClickSelector(page, selectors.closeThreadBtn)

	// Enter a problem
	await page.waitForSelector(selectors.problemTextArea)
	await page.type(selectors.problemTextArea, problem)

	await guidedFlowUtils.nextStep(page)

	// Enter a solution
	await page.waitForSelector(selectors.solutionTextArea)
	await page.type(selectors.solutionTextArea, solution)

	await guidedFlowUtils.nextStep(page)

	// Add a new Product Improvement
	await macros.waitForThenClickSelector(page, selectors.addProductImprovement)
	await page.waitForSelector('input#root_name')
	await page.type('input#root_name', productImprovement2Name)
	await macros.waitForThenClickSelector(page, '[data-test="card-creator__submit"]')

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

	const pi1CardChatSummary = `[data-test-component="card-chat-summary"][data-test-id="${productImprovement1.id}"]`
	await page.waitForSelector(`[data-test="segment-card--product-improvements"] ${pi1CardChatSummary}`)
	linkedProductImprovements = await page.$$(selectors.linkedProductImprovements)
	test.is(linkedProductImprovements.length, 2)

	await guidedFlowUtils.nextStep(page)

	const listedProductImprovements = await page.$$(selectors.summaryProductImprovements)
	test.is(listedProductImprovements.length, 2)

	await guidedFlowUtils.action(page)

	// Check that the thread is now closed
	await page.waitForSelector(selectors.archiveThreadBtn)

	// Check the whisper
	const whisperText = await macros.getElementText(page, selectors.whisper)
	test.true(whisperText.includes(problem))
	test.true(whisperText.includes(solution))
})
