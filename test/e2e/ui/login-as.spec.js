const {
	test, expect
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const livechatMacros = require('../livechat/macros')
const {
	v4: uuid
} = require('uuid')

let sdk = {}
let user = {}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await livechatMacros.prepareUser(sdk, await sdk.card.get('org-balena'), 'user-community', 'User')
})

test.beforeEach(async ({
	page,
	baseURL
}) => {
	const oauthUrl = 'https://dashboard.balena-cloud.com/login/oauth/jellyfish'
	const code = uuid()

	await page.route('**/*', async (route) => {
		const url = new URL(route.request().url())

		if (url.href.startsWith(oauthUrl)) {
			const state = url.searchParams.get('state')

			await route.fulfill({
				status: 301,
				headers: {
					Location: `${baseURL}/oauth/callback?state=${encodeURIComponent(state)}&code=${code}`
				}
			})
		} else if (url.pathname === '/api/v2/oauth/balena-api') {
			const body = route.request().postDataJSON()
			expect(body.slug).toBe(user.card.slug)
			expect(body.code).toBe(code)

			await route.fulfill({
				contentType: 'application/json',
				headers: {
					'access-control-allow-origin': '*'
				},
				status: 200,
				body: JSON.stringify({
					error: false,
					data: {
						access_token: user.sdk.getAuthToken()
					}
				})
			})
		} else {
			await route.continue()
		}
	})
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.unroute('**/*')
	await page.close()
})

test.describe('Login as', () => {
	test('Should initiate oauth process if not logged in', async ({
		page
	}) => {
		// 1. Reuqest livechat page with specific user
		await page.goto(`/livechat?login-as=${user.card.slug.replace('user-', '')}`)

		// 2. Redirected to /oauth/callback page
		await page.waitForURL((url) => {
			return url.pathname === '/oauth/callback'
		})

		// 3. Log in with oauth code and redirect back to livechat page
		await page.waitForURL('/livechat')
	})
})
