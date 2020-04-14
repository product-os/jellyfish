/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const _ = require('lodash')
const helpers = require('../../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('a community user should not be able to reset other user\'s passwords given the right password', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: newUserDetails.email,
				username: `user-${newUserDetails.username}`,
				password: newUserDetails.password
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 200)

	const newUser = await test.context.sdk.card.get(result2.response.data.id)

	test.truthy(newUser.data.hash)
	test.deepEqual(newUser.data, {
		email: newUserDetails.email,
		hash: newUser.data.hash,
		avatar: null,
		roles: [ 'user-community' ]
	})

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: newUser.id,
			type: 'user',
			action: 'action-set-password@1.0.0',
			arguments: {
				newPassword: 'foobarbaz',
				currentPassword: newUserDetails.password
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result3.code, 400)
	test.true(result3.response.error)
	test.is(result3.response.data.name, 'WorkerAuthenticationError')

	const newUserAfter = await test.context.sdk.card.get(newUser.id)
	test.deepEqual(newUserAfter.data, newUser.data)
})

ava.serial('a community user should not be able to reset other user\'s passwords given an incorrect password', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: newUserDetails.email,
				username: `user-${newUserDetails.username}`,
				password: newUserDetails.password
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 200)

	const newUser = await test.context.sdk.card.get(result2.response.data.id)
	test.truthy(newUser.data.hash)
	test.deepEqual(newUser.data, {
		email: newUserDetails.email,
		hash: newUser.data.hash,
		avatar: null,
		roles: [ 'user-community' ]
	})

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: newUser.id,
			type: 'user',
			action: 'action-set-password@1.0.0',
			arguments: {
				newPassword: 'foobarbaz',
				currentPassword: 'incorrect password'
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result3.code, 400)
	test.true(result3.response.error)
	test.is(result3.response.data.name, 'WorkerAuthenticationError')

	const newUserAfter = await test.context.sdk.card.get(newUser.id)
	test.deepEqual(newUserAfter.data, newUser.data)
})

ava.serial('a community user should not be able to reset other user\'s passwords given no password', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: newUserDetails.email,
				username: `user-${newUserDetails.username}`,
				password: newUserDetails.password
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 200)

	const newUser = await test.context.sdk.card.get(result2.response.data.id)
	test.truthy(newUser.data.hash)
	test.deepEqual(newUser.data, {
		email: newUserDetails.email,
		hash: newUser.data.hash,
		avatar: null,
		roles: [ 'user-community' ]
	})

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: newUser.id,
			type: 'user',
			action: 'action-set-password@1.0.0',
			arguments: {
				newPassword: 'foobarbaz',
				currentPassword: null
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result3.code, 400)
	test.true(result3.response.error)
	test.is(result3.response.data.name, 'WorkerAuthenticationError')

	const newUserAfter = await test.context.sdk.card.get(newUser.id)
	test.deepEqual(newUserAfter.data, newUser.data)
})

ava.serial('a community user should not be able to set a first time password to another user', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const newUser = await test.context.sdk.card.create({
		slug: `user-${newUserDetails.username}`,
		type: 'user',
		data: {
			email: newUserDetails.email,
			hash: 'PASSWORDLESS',
			roles: [ 'user-community' ]
		}
	})

	const newUserCard = await test.context.sdk.card.get(newUser.id)
	test.deepEqual(newUserCard.data, {
		email: newUserDetails.email,
		hash: 'PASSWORDLESS',
		roles: [ 'user-community' ],
		avatar: null
	})

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: newUser.id,
			type: 'user',
			action: 'action-set-password@1.0.0',
			arguments: {
				newPassword: newUserDetails.password,
				currentPassword: null
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 400)
	test.true(result2.response.error)
	test.is(result2.response.data.name, 'WorkerAuthenticationError')

	const newUserAfter = await test.context.sdk.card.get(newUser.id)

	test.deepEqual(newUserAfter.data, {
		email: newUserDetails.email,
		hash: 'PASSWORDLESS',
		roles: [ 'user-community' ],
		avatar: null
	})
})

ava.serial('creating a role with a user community session using action-create-card should fail', async (test) => {
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const result2 = await test.context.http('POST', '/api/v2/action', {
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
	}, {
		Authorization: `Bearer ${token}`
	})

	test.is(result2.code, 400)
	test.deepEqual(result2.response, {
		error: true,
		data: {
			context: result2.response.data.context,
			name: 'QueueInvalidRequest',
			message: 'No such input card: role@1.0.0'
		}
	})
})

ava.serial('.query() community users should be able to query views', async (test) => {
	const userDetails = createUserDetails()

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

	await test.context.sdk.auth.login(userDetails)

	const results = await test.context.sdk.query({
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'view@1.0.0'
			}
		}
	})

	test.true(_.includes(_.map(results, 'slug'), 'view-all-views'))
})

ava.serial('creating a user with a community user session should succeed', async (test) => {
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-user@1.0.0',
			arguments: {
				email: newUserDetails.email,
				username: `user-${newUserDetails.username}`,
				password: newUserDetails.password
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 200)

	const newUserId = result2.response.data.id

	const card = await test.context.sdk.card.get(newUserId)

	test.deepEqual(card, {
		created_at: card.created_at,
		linked_at: card.linked_at,
		updated_at: card.updated_at,
		tags: [],
		capabilities: [],
		requires: [],
		links: {},
		version: '1.0.0',
		markers: [],
		active: true,
		type: card.type,
		slug: `user-${newUserDetails.username}`,
		id: card.id,
		name: null,
		data: {
			email: newUserDetails.email,
			roles: [ 'user-community' ],
			hash: card.data.hash,
			avatar: null
		}
	})
})

ava.serial('users with the "user-community" role should not be able to change other users passwords', async (test) => {
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

	const communityUserDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${communityUserDetails.username}`,
			email: communityUserDetails.email,
			password: communityUserDetails.password
		}
	})

	await sdk.auth.login(communityUserDetails)

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

ava.serial('users with the "user-community" role should not be able to change other users roles', async (test) => {
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

	const communityUserDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${communityUserDetails.username}`,
			email: communityUserDetails.email,
			password: communityUserDetails.password
		}
	})

	await sdk.auth.login(communityUserDetails)

	const error = await test.throwsAsync(sdk.card.update(
		targetUser.id,
		targetUser.type,
		[
			{
				op: 'replace',
				path: '/data/roles',
				value: [ 'user-community', 'test' ]
			}
		]
	))

	test.is(error.name, 'JellyfishSchemaMismatch')
})

ava.serial('users with the "user-community" role should not be able to change the guest user roles', async (test) => {
	const {
		sdk
	} = test.context

	const communityUserDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${communityUserDetails.username}`,
			email: communityUserDetails.email,
			password: communityUserDetails.password
		}
	})

	const targetUser = await sdk.card.get('user-guest')
	await sdk.auth.login(communityUserDetails)

	const error = await test.throwsAsync(sdk.card.update(
		targetUser.id,
		targetUser.type,
		[
			{
				op: 'replace',
				path: '/data/roles',
				value: [ 'user-community', 'test' ]
			}
		]
	))

	test.is(error.name, 'WorkerNoElement')
})

ava.serial('users with the "user-community" role should not be able to change its own roles', async (test) => {
	const {
		sdk
	} = test.context

	const communityUserDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${communityUserDetails.username}`,
			email: communityUserDetails.email,
			password: communityUserDetails.password
		}
	})

	await sdk.auth.login(communityUserDetails)

	const error = await test.throwsAsync(sdk.card.update(
		targetUser.id,
		targetUser.type,
		[
			{
				op: 'replace',
				path: '/data/roles',
				value: [ 'user-community', 'test' ]
			}
		]
	))

	test.is(error.name, 'JellyfishSchemaMismatch')
})

ava.serial('.query() users with the community role' +
'should NOT be able to see view-all-users for their organisation', async (test) => {
	const {
		sdk
	} = test.context
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const [ balenaOrg ] = await sdk.query({
		type: 'object',
		required: [ 'type', 'slug' ],
		properties: {
			type: {
				type: 'string',
				const: 'org@1.0.0'
			},
			slug: {
				type: 'string',
				const: 'org-balena'
			}
		}
	})

	await sdk.card.link(balenaOrg, user, 'has member')

	await sdk.auth.login(userDetails)

	const [ viewAllUsers ] = await test.context.sdk.query({
		type: 'object',
		required: [ 'type', 'slug' ],
		properties: {
			type: {
				type: 'string',
				const: 'view@1.0.0'
			},
			slug: {
				type: 'string',
				const: 'view-all-users'
			}
		}
	})

	test.is(viewAllUsers, undefined)
})
