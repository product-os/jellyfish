const environment = require('@balena/jellyfish-environment').defaultEnvironment
const {
	test, expect
} = require('@playwright/test')
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const macros = require('./macros')

let sdk = {}

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
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test.describe('Contract actions', () => {
	test('Should let users copy a working permalink', async ({
		page,
		browser
	}) => {
		const context = await browser.newContext()

		// https://playwright.dev/docs/api/class-browsercontext#browser-context-grant-permissions
		await context.grantPermissions([ 'clipboard-read' ])
		const newpage = await context.newPage()
		await login(newpage, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the thread and copy its permalink
		await newpage.goto(`/${contract.id}`)
		await newpage.waitForSelector('.column--thread')
		await newpage.locator('[data-test="card-action-menu"]').click()
		await newpage.locator('[data-test="card-action-menu__permalink"]').click()

		const permalink = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText()
		})

		context.clearPermissions()

		await newpage.goto(permalink)
		await newpage.reload()
		await newpage.waitForSelector('.column--thread')
		const url = newpage.url()

		// Needs to be proto://jel.{{uuid}}.{{dns_tld}} (sans :UI_PORT)
		expect(url).toEqual(
			`${environment.oauth.redirectBaseUrl}/${contract.slug}`
		)

		await newpage.close()
	})

	test('Should let users copy a card as JSON', async ({
		page, browser
	}) => {
		const context = await browser.newContext()
		await context.grantPermissions([ 'clipboard-read' ])
		const newpage = await context.newPage()
		await login(newpage, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the thread and copy its JSON
		await newpage.goto(`/${contract.id}`)
		await newpage.locator('[data-test="card-action-menu"]').click()
		await newpage.locator('[data-test="card-action-menu__json"]').click()

		const copiedJSON = await newpage.evaluate(() => {
			return window.navigator.clipboard.readText()
		})

		context.clearPermissions()

		expect(_.omit(contract, [ 'links' ]).slug).toEqual(
			_.omit(JSON.parse(copiedJSON), [ 'links' ]).slug
		)

		await newpage.close()
	})

	test('Should let users delete a card', async ({
		page
	}) => {
		await login(page, users.community)

		// Create a thread contract
		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})

		// Go to the created thread and delete it
		await page.goto(`/${contract.id}`)
		await page.locator('[data-test="card-action-menu"]').click()
		await page.locator('[data-test="card-action-menu__delete"]').click()
		await page.locator('[data-test="card-delete__submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		const updatedContract = await sdk.card.get(contract.id)
		expect(updatedContract.active).toBeFalsy()
	})

	test('Should let users add a custom field to a card', async ({
		page
	}) => {
		await login(page, users.community)

		const fieldName = 'test'
		const fieldValue = 'lorem ipsom dolor sit amet'

		const contract = await sdk.card.create({
			slug: `thread-${uuid()}`,
			type: 'thread@1.0.0'
		})
		await page.goto(`/${contract.id}`)

		// Add a new custom field called "test"
		await page.locator('.card-actions__btn--edit').click()
		await page.waitForSelector(
			'[data-test="card-edit__free-field-name-input"]'
		)
		await macros.setInputValue(
			page,
			'[data-test="card-edit__free-field-name-input"]',
			fieldName
		)
		await page.locator('[data-test="card-edit__add-free-field"]').click()

		// Input a value to the new field and save the changes
		await page.waitForSelector('#root_test')
		await macros.setInputValue(page, '#root_test', fieldValue)
		await page.locator('[data-test="card-edit__submit"]').click()

		// Wait for the success alert as a heuristic for the action completing
		await macros.waitForThenDismissAlert(page, 'Success!')

		// Check that the card now has the expected value
		const updatedCard = await sdk.card.get(contract.id)
		expect(updatedCard.data[fieldName]).toEqual(fieldValue)
	})
})
