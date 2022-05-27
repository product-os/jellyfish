const environment = require('@balena/jellyfish-environment').defaultEnvironment
const {
	test
} = require('@playwright/test')
const sdkHelpers = require('../sdk/helpers')
const livechatMacros = require('./livechat/macros')
const uiMacros = require('./macros')

let sdk = {}
let user = {}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	user = await livechatMacros.prepareUser(sdk, await sdk.card.get('org-balena'), 'user-community', 'User')
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test.describe('Login as', () => {
	test('Should initiate oauth process if not logged in', async ({
		page
	}) => {
		// 1. Log into jel.ly.fish
		await uiMacros.loginUser(page, user.credentials)

		// 2. Open livechat.ly.fish/livechat and login with jellyfish
		const livechatUrl = new URL('/livechat', environment.livechat.host)
		livechatUrl.searchParams.append('loginAs', user.card.slug.replace('user-', ''))
		livechatUrl.searchParams.append('loginWithProvider', 'jellyfish')
		await page.goto(livechatUrl.toString())

		// 3. Should perform oauth flow
		await page.waitForURL((url) => {
			return url.pathname === '/oauth/callback'
		})

		// 4. Should log in and redirect to livechat.ly.fish/livechat
		await page.waitForURL((url) => {
			return url.href === `${environment.livechat.host}/livechat`
		})
	})
})
