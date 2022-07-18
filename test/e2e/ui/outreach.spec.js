const environment = require('@balena/jellyfish-environment').defaultEnvironment
const {
	test, expect
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')

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
test.describe('Outreach', () => {
	test('Should redirect to correct endpoint', async ({
		page, baseURL
	}) => {
		await login(page, users.community)

		// Navigate to the user profile page
		await page.goto(`/${user.slug}`)
		await page
			.locator(
				'[data-test="lens--lens-my-user"] button.card-actions__btn--edit'
			)
			.click()
		await page
			.locator(
				'[data-test="lens--edit-my-user"] button[role="tab"]:nth-of-type(4)'
			)
			.click()

		// Wait for the Outreach API redirect to occur
		let url = null
		await page.route(
			'https://api.outreach.io/oauth/authorize**',
			async (route) => {
				url = new URL(route.request().url())
				route.abort('aborted')
			}
		)

		await page
			.locator('[data-test="integration-connection--outreach"]')
			.click()
		await new Promise((resolve) => {
			setTimeout(resolve, 1000)
		})

		const scope = [
			'mailboxes.all',
			'prospects.all',
			'sequences.all',
			'sequenceStates.all',
			'sequenceSteps.all',
			'sequenceTemplates.all',
			'webhooks.all'
		].join('+')

		expect(url.origin + url.pathname).toBe(
			'https://api.outreach.io/oauth/authorize'
		)

		const params = Object.fromEntries(url.searchParams)
		expect(params.response_type).toBe('code')
		expect(params.client_id).toBe(environment.integration.outreach.appId)
		expect(params.scope).toBe(scope)

		const state = JSON.parse(params.state)
		expect(state.providerSlug).toBe('oauth-provider-outreach@1.0.0')
		expect(state.userSlug).toBe(user.slug)
		expect(state.returnUrl).toBe(`${baseURL}/${user.slug}`)

		await page.unroute('https://api.outreach.io/oauth/authorize**')
	})
})
