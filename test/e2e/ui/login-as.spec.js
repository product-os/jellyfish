const {
	test
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const livechatMacros = require('./livechat/macros')
const {
	mockLoginAs
} = require('./macros')

let sdk = {}
let user = {}
let unmockLoginAs = null

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await livechatMacros.prepareUser(sdk, await sdk.card.get('org-balena'), 'user-community', 'User')
})

test.beforeEach(async ({
	page,
	baseURL
}) => {
	unmockLoginAs = await mockLoginAs(page, baseURL, user)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await unmockLoginAs()
	await page.close()
})

test.describe('Login as', () => {
	test('Should initiate oauth process if not logged in', async ({
		page
	}) => {
		// 1. Reuqest livechat page with specific user
		await page.goto(`/livechat?loginAs=${user.card.slug.replace('user-', '')}`)

		// 2. Redirected to /oauth/callback page
		await page.waitForURL((url) => {
			return url.pathname === '/oauth/callback'
		})

		// 3. Log in with oauth code and redirect back to livechat page
		await page.waitForURL('/livechat')
	})
})
