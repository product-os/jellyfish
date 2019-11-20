/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const _ = require('lodash')
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

ava.serial('a community user should not be able to reset other user\'s passwords given the right password', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user',
			type: 'type',
			action: 'action-create-user',
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
			action: 'action-set-password',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user',
			type: 'type',
			action: 'action-create-user',
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
			action: 'action-set-password',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()
	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user',
			type: 'type',
			action: 'action-create-user',
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
			action: 'action-set-password',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
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
			action: 'action-set-password',
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

ava.serial('creating a user with the guest user session should fail', async (test) => {
	const userDetails = createUserDetails()
	const username = `user-${userDetails.username.toLowerCase()}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
			message: 'No such action: action-create-user'
		}
	})
})

ava.serial('creating a role with a user community session using action-create-card should fail', async (test) => {
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const result2 = await test.context.http('POST', '/api/v2/action', {
		card: 'role',
		type: 'type',
		action: 'action-create-card',
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
			message: 'No such input card: role'
		}
	})
})

ava.serial('creating a role with the guest user session using action-create-card should fail', async (test) => {
	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'role',
		type: 'type',
		action: 'action-create-card',
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
			message: 'No such action: action-create-card'
		}
	})
})

ava.serial('creating a user with the guest user session using action-create-card should fail', async (test) => {
	const username = `user-${createUserDetails().username}`

	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user',
		type: 'type',
		action: 'action-create-card',
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
			message: 'No such action: action-create-card'
		}
	})
})

ava.serial('creating a user with a community user session should succeed', async (test) => {
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result1.code, 200)

	const token = result1.response.data.id

	const newUserDetails = createUserDetails()

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user',
			type: 'type',
			action: 'action-create-user',
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
		type: 'user',
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

ava.serial('Users should be able to change their own email addresses', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: user.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/email',
						value: 'test@example.com'
					}
				]
			}
		}, {
			Authorization: `Bearer ${sdk.getAuthToken()}`
		})

	test.is(result.code, 200)
	test.false(result.response.error)
})

ava.serial('Users should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const activeUserDetails = createUserDetails()

	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${activeUserDetails.username}`,
			email: activeUserDetails.email,
			password: activeUserDetails.password
		}
	})
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id, {
		type: 'user'
	})

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('.query() the guest user should only see its own private fields', async (test) => {
	const userDetails = {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}

	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
				const: 'user'
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

ava.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context
	const userDetails = createUserDetails()

	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const thread = await sdk.card.create({
		type: 'thread'
	})

	// Set up the watcher before the card is updated to stop race conditions from
	// happening
	// Wait for links to be materialized
	const waitQuery = {
		type: 'object',
		additionalProperties: true,
		$$links: {
			'has attached element': {
				type: 'object',
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: 'update'
					}
				}
			}
		},
		properties: {
			id: {
				type: 'string',
				const: thread.id
			}
		},
		required: [ 'id' ]
	}

	await test.context.executeThenWait(async () => {
		const result = await test.context.http(
			'POST', '/api/v2/action', {
				card: thread.slug,
				type: thread.type,
				action: 'action-update-card',
				arguments: {
					reason: null,
					patch: [
						{
							op: 'add',
							path: '/data/description',
							value: 'Lorem ipsum dolor sit amet'
						}
					]
				}
			}, {
				Authorization: `Bearer ${sdk.getAuthToken()}`
			})

		if (result.code !== 200) {
			throw new Error(`Error code: ${result.code}`)
		}
	}, waitQuery)

	const card = await sdk.card.getWithTimeline(thread.id, {
		type: 'thread'
	})
	test.truthy(card)

	const timelineActors = _.uniq(card.links['has attached element'].map((item) => {
		return item.data.actor
	}))

	test.deepEqual(timelineActors, [ user.id ])
})

ava.serial('.query() community users should be able to query views', async (test) => {
	const userDetails = createUserDetails()

	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
				const: 'view'
			}
		}
	})

	test.true(_.includes(_.map(results, 'slug'), 'view-all-views'))
})

ava.serial('the guest user should not be able to add a new role to another user', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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

ava.serial('users with the "user-community" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const targetUser = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const communityUserDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const communityUserDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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
		card: 'user',
		type: 'type',
		action: 'action-create-user',
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

ava.serial('When updating a user, inaccessible fields should not be removed', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	// Create a new user
	const user = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await sdk.auth.login(userDetails)

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: user.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/email',
						value: 'test@example.com'
					}
				]
			}
		}, {
			Authorization: `Bearer ${sdk.getAuthToken()}`
		})

	test.is(result.code, 200)
	test.false(result.response.error)

	await sdk.auth.loginWithToken(test.context.token)
	const rawUserCard = await test.context.sdk.card.get(user.id)
	test.is(rawUserCard.data.email, 'test@example.com')
	test.is(_.has(rawUserCard, [ 'data', 'roles' ]), true)
	test.is(_.has(rawUserCard, [ 'data', 'hash' ]), true)
})

ava.serial('Users should not be able to login as the core admin user', async (test) => {
	const {
		sdk
	} = test.context

	// First check that the guest user cannot login
	sdk.auth.logout()

	const error1 = await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	test.is(error1.name, 'WorkerAuthenticationError')

	sdk.setAuthToken(test.context.token)
	const userData = createUserDetails()

	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userData.username}`,
			email: userData.email,
			password: userData.password
		}
	})

	await sdk.auth.login(userData)

	const error2 = await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	test.is(error2.name, 'WorkerAuthenticationError')
})

ava.serial('.query() additionalProperties should not affect listing users as a new user', async (test) => {
	const id = uuid()

	const details = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${details.username}`,
			email: details.email,
			password: details.password
		}
	})

	const userDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})
	await test.context.sdk.auth.login(userDetails)
	const results1 = await test.context.sdk.query({
		type: 'object',
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			},
			id: {
				type: 'string',
				const: id
			}
		}
	})
	const results2 = await test.context.sdk.query({
		type: 'object',
		additionalProperties: true,
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			},
			id: {
				type: 'string',
				const: id
			}
		}
	})
	test.deepEqual(_.map(results1, 'id'), _.map(results2, 'id'))
})

ava.serial('should apply permissions on resolved links', async (test) => {
	const {
		sdk
	} = test.context

	const user1Details = createUserDetails()
	const targetDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${user1Details.username}`,
			email: user1Details.email,
			password: user1Details.password
		}
	})
	const targetUserInfo = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${targetDetails.username}`,
			email: targetDetails.email,
			password: targetDetails.password
		}
	})
	const targetUser = await test.context.sdk.card.get(targetUserInfo.id)

	await test.context.sdk.auth.login(user1Details)

	const id = uuid()

	const messageRequest = await sdk.event.create({
		type: 'message',
		tags: [],
		target: targetUser,
		payload: {
			message: id
		}
	})

	const message = await sdk.card.get(messageRequest.id)

	const results = await sdk.query({
		$$links: {
			'is attached to': {
				type: 'object',
				additionalProperties: true,
				required: [ 'type' ],
				properties: {
					type: {
						type: 'string',
						const: 'user'
					}
				}
			}
		},
		type: 'object',
		required: [ 'id', 'type', 'links', 'data', 'slug' ],
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'object',
						required: [ 'message' ],
						properties: {
							message: {
								type: 'string',
								const: id
							}
						}
					}
				},
				additionalProperties: true
			},
			slug: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: message.id,
			slug: message.slug,
			type: 'message',
			version: '1.0.0',
			updated_at: null,
			linked_at: message.linked_at,
			created_at: message.created_at,
			name: null,
			active: true,
			tags: [],
			requires: [],
			capabilities: [],
			markers: [],
			links: {
				'is attached to': [
					Object.assign({}, targetUser, {
						links: results[0].links['is attached to'][0].links,
						linked_at: results[0].links['is attached to'][0].linked_at,
						data: _.omit(targetUser.data, [ 'hash', 'roles', 'profile' ])
					})
				]
			},
			data: message.data
		}
	])
})

ava.serial('Users should not be able to create sessions as other users', async (test) => {
	const {
		sdk
	} = test.context

	const user1Details = createUserDetails()
	const targetDetails = createUserDetails()
	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${user1Details.username}`,
			email: user1Details.email,
			password: user1Details.password
		}
	})
	const targetUserInfo = await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${targetDetails.username}`,
			email: targetDetails.email,
			password: targetDetails.password
		}
	})
	const targetUser = await test.context.sdk.card.get(targetUserInfo.id)

	await test.context.sdk.auth.login(user1Details)

	const error = await test.throwsAsync(async () => {
		await sdk.card.create({
			slug: `session-${targetUser.slug}-${Date.now()}`,
			type: 'session',
			data: {
				actor: targetUser.id,
				expiration: new Date(Date.now() + 1000 * 120).toISOString()
			}
		})
	})

	test.is(error.name, 'JellyfishSchemaMismatch')
})

ava.serial('Users should not be able to create action requests', async (test) => {
	const {
		sdk
	} = test.context

	const actionRequest = {
		type: 'action-request',
		slug: 'action-request-8202f128-dbc2-4629-8318-609cdbc20336',
		data: {
			epoch: 1559123116431,
			timestamp: '2019-05-29T09:45:16.431Z',
			context: {
				id: 'REQUEST-17.21.6-237c6999-64bb-4df0-ba7f-2f303003a609',
				api: 'SERVER-17.21.6-localhost-e0f6fe9b-60e3-4d41-b575-1e719febe55b'
			},
			actor: 'ea04afb6-5574-483f-bf06-7490e54e0a74',
			action: 'action-create-session',
			input: {
				id: '42d1cd57-a052-49df-b416-3ade986c1aec'
			},
			arguments: {
				password:
					'696dba0661d2ab3eb0c1fe5c417ca8c18278f5a324ebc8827dbcef829e07c20'
			}
		}
	}

	const userDetails = createUserDetails()

	await test.context.sdk.action({
		card: 'user',
		type: 'type',
		action: 'action-create-user',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	await test.context.sdk.auth.login(userDetails)

	const error = await test.throwsAsync(async () => {
		await sdk.card.create(actionRequest)
	})

	test.is(error.name, 'JellyfishSchemaMismatch')
})
