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

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

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

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const user = await sdk.auth.whoami()

	// Since the email is randomly generated, we expect the gravatar value to be
	// null
	test.falsy(user.data.avatar)
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

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const user = await sdk.auth.whoami()

	const avatarUrl = `https://www.gravatar.com/avatar/${md5(user.data.email.trim())}?d=404`

	test.is(user.data.avatar, avatarUrl)

	nock.cleanAll()
})

ava.serial('Users should be able to read other users, even if they don\'t have an email address', async (test) => {
	const {
		sdk
	} = test.context

	const user1Details = createUserDetails()
	const user2Details = createUserDetails()

	// Create user 1 and login as them
	await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${user1Details.username}`,
			email: user1Details.email,
			password: user1Details.password
		}
	})

	await sdk.auth.login(user1Details)

	const user1 = await sdk.auth.whoami()

	// Remove the email field from user 1
	await sdk.card.update(user1.id, 'user', [
		{
			op: 'remove',
			path: '/data/email'
		}
	])

	// Create and login as user 2
	await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${user2Details.username}`,
			email: user2Details.email,
			password: user2Details.password
		}
	})

	await sdk.auth.login(user2Details)

	// Try and read user 1
	const result = await sdk.card.get(user1.id)

	test.is(result.id, user1.id)
})
