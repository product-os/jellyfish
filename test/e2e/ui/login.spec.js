const {
	test
} = require('@playwright/test')
const {
	v4: uuid
} = require('uuid')

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

test.describe('Core', () => {
	test('Should let users login', async ({
		page
	}) => {
		await login(page, users.community)
	})
})
