/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const _ = require('lodash')
const helpers = require('../../sdk/helpers')
const createUserDetails = require('./helpers').createUserDetails

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

ava.serial('creating a user with the guest user session should fail', async (test) => {
	const userDetails = createUserDetails()
	const username = `user-${userDetails.username.toLowerCase()}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			email: userDetails.email,
			username,
			password: userDetails.password
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'QueueInvalidAction',
			message: 'No such action: action-create-user@1.0.0'
		}
	})
})

ava.serial('creating a role with the guest user session using action-create-card should fail', async (test) => {
	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'role@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: `role-test-${uuid()}`,
				data: {
					read: {
						type: 'object',
						additionalProperties: true
					}
				}
			}
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'QueueInvalidAction',
			message: 'No such action: action-create-card@1.0.0'
		}
	})
})

ava.serial('creating a user with the guest user session using action-create-card should fail', async (test) => {
	const username = `user-${createUserDetails().username}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: username,
				type: 'user'
			}
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'QueueInvalidAction',
			message: 'No such action: action-create-card@1.0.0'
		}
	})
})

ava.serial('.query() the guest user should only see its own private fields', async (test) => {
	const userDetails = {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}

	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await test.context.sdk.auth.logout()
	const results = await test.context.sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				enum: [ 'user', 'user@1.0.0' ]
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				}
			}
		},
		additionalProperties: true
	})

	_.map(results, (user) => {
		test.false(user.slug === 'user-admin')
		if (user.slug === 'user-guest') {
			// The "guest-user" should be fetched with all fields
			test.is(user.data.email, 'accounts+jellyfish@resin.io')
		} else {
			// The other users would only have non-private fields
			test.is(user.data, undefined)
		}
	})
})

ava.serial('the guest user should not be able to add a new role to another user', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.logout()

	const error = await test.throwsAsync(sdk.card.update(
		targetUser.id,
		targetUser.type,
		[
			{
				op: 'replace',
				path: '/data/roles/1',
				value: 'test'
			}
		]
	))

	test.is(error.name, 'JellyfishSchemaMismatch')
})

ava.serial('the guest user should not be able to change its own roles', async (test) => {
	const {
		sdk
	} = test.context

	const user = await sdk.card.get('user-guest')
	await sdk.auth.logout()

	const error = await test.throwsAsync(sdk.card.update(
		user.id,
		user.type,
		[
			{
				op: 'replace',
				path: '/data/roles/1',
				value: [ 'user-community' ]
			}
		]
	))

	test.is(error.name, 'JellyfishSchemaMismatch')
})

ava.serial('the guest user should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.logout()

	const error = await test.throwsAsync(sdk.card.update(
		targetUser.id,
		targetUser.type,
		[
			{
				op: 'replace',
				path: '/data/hash',
				value: '6dafdadfffffffaaaaa'
			}
		]
	))

	test.is(error.name, 'JellyfishSchemaMismatch')
})
