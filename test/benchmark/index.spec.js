const {
	test
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../e2e/sdk/helpers')
const uiHelpers = require('../e2e/ui/helpers')
const macros = require('../e2e/ui/macros')

let sdk = {}
const user = {
	username: `johndoe-${uuid()}`,
	email: `johndoe-${uuid()}@example.com`,
	password: 'password'
}

test.beforeAll(async () => {
	sdk = await sdkHelpers.login()
	const created = await uiHelpers.createUser(sdk, user)
	await uiHelpers.addUserToBalenaOrg(sdk, created.id)
})

test.beforeEach(async ({
	page
}) => {
	await macros.loginUser(page, user)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})

test('Create contract through the SDK', async ({
	page
}) => {
	await page.evaluate(() => {
		return window.sdk.card.create({
			type: 'thread@1.0.0',
			data: {}
		})
	})
})
