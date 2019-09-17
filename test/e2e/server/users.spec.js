/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const md5 = require('blueimp-md5')
const nock = require('nock')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.before)
ava.after(helpers.sdk.after)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('Users should have an avatar value set to null if it doesn\'t exist', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	await test.context.createUser(userDetails)

	await sdk.auth.login(userDetails)

	const user = await sdk.auth.whoami()

	// Since the email is randomly generated, we expect the gravatar value to be
	// null
	test.is(user.data.avatar, null)
})

// TODO: Get nock to successfully intercept calls to Gravatar so we can enable
// this test
ava.serial.skip('Users should have an avatar value calculated on signup', async (test) => {
	const {
		sdk
	} = test.context

	// Use nock to simulate a successful gravatar request
	nock.cleanAll()
	await nock('https://www.gravatar.com')
		.head((uri) => {
			uri.includes('avatar')
		})
		.reply(200, 'domain matched')

	const userDetails = createUserDetails()

	await test.context.createUser(userDetails)

	await sdk.auth.login(userDetails)

	const user = await sdk.auth.whoami()

	const avatarUrl = `https://www.gravatar.com/avatar/${md5(user.data.email.trim())}?d=404`

	test.is(user.data.avatar, avatarUrl)

	nock.cleanAll()
})
