const {
	test
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')
const macros = require('./macros')

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

test.afterEach(async ({
	page
}) => {
	await page.close()
})

test.describe('Lens', () => {
	test('A lens selection should be remembered', async ({
		page
	}) => {
		await login(page, users.community)

		await macros.navigateToHomeChannelItem(page, [
			'[data-test="home-channel__group-toggle--org-balena"]',
			'[data-test="home-channel__group-toggle--Support"]',
			'[data-test="home-channel__item--view-paid-support-threads"]'
		])

		await page.waitForSelector('.column--view-paid-support-threads')
		await page.locator('[data-test="lens-selector--lens-kanban"]').click()
		await page.waitForSelector('[data-test="lens--lens-kanban"]')
		await page
			.locator('[data-test="home-channel__item--view-all-forum-threads"]')
			.click()
		await page.waitForSelector('.column--view-all-forum-threads')

		// Allow some time for the lens selection to be stored
		await new Promise((resolve) => {
			setTimeout(resolve, 5000)
		})

		await page
			.locator('[data-test="home-channel__item--view-paid-support-threads"]')
			.click()
		await page.waitForSelector('.column--view-paid-support-threads')
		await page.waitForSelector('[data-test="lens--lens-kanban"]')
	})
})
