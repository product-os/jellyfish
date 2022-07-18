const {
	test, expect
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')
const macros = require('./macros')

let sdk = {}
let user = {}
let user2 = {}

const users = {
	community: {
		username: `johndoe-${uuid()}`,
		email: `johndoe-${uuid()}@example.com`,
		password: 'password'
	},
	community2: {
		username: `janedoe-${uuid()}`,
		email: `janedoe-${uuid()}@example.com`,
		password: 'password'
	},
	admin: {
		username: `team-admin-${uuid()}`,
		email: `team-admin-${uuid()}@example.com`,
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
	user2 = await helpers.createUser(sdk, users.community2)
	await helpers.addUserToBalenaOrg(sdk, user2.id)
})

test.afterEach(async ({
	page
}) => {
	sdkHelpers.afterEach(sdk)
	await page.close()
})
test.describe('User Status', () => {
	test('You should be able to enable and disable Do Not Disturb', async ({
		page
	}) => {
		await login(page, users.community)

		const dndButtonSelector = '[data-test="button-dnd"]'
		const verifyDndState = async (expectedOn) => {
			// Open the user menu
			await page.locator('.user-menu-toggle').click()

			await page.waitForSelector(dndButtonSelector)

			// A 'check' icon implies 'Do Not Disturb' is ON
			const checkIcon = await page.$(`${dndButtonSelector} i`)
			expect(Boolean(checkIcon)).toEqual(expectedOn)

			// The user's avatar should also have a status icon if 'Do Not Disturb' is ON
			const statusIcon = await page.$('.user-menu-toggle .user-status-icon i')
			expect(Boolean(statusIcon)).toEqual(expectedOn)
		}

		const toggleDnd = async () => {
			await page.locator(dndButtonSelector).click()
			await macros.waitForThenDismissAlert(page, 'Success!')
		}

		await verifyDndState(false)
		await toggleDnd()
		await verifyDndState(true)
		await toggleDnd()
		await verifyDndState(false)
	})
})
