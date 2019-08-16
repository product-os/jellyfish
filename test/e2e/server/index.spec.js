/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const md5 = require('blueimp-md5')
const nock = require('nock')
const uuid = require('uuid/v4')
const _ = require('lodash')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

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

ava.serial('should parse application/vnd.api+json bodies', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		}, {
			'Content-Type': 'application/vnd.api+json'
		})

	test.is(result.code, 200)
	test.truthy(result.headers['x-request-id'])
	test.truthy(result.headers['x-api-id'])
})

ava.serial('should include the request and api ids on responses', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result.code, 200)
	test.truthy(result.headers['x-request-id'])
	test.truthy(result.headers['x-api-id'])
})

ava.serial('should create different request ids for every response', async (test) => {
	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: user.slug,
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: userDetails.password
			}
		})

	test.not(result1.headers['x-request-id'], result2.headers['x-request-id'])
	test.not(result2.headers['x-request-id'], result3.headers['x-request-id'])
	test.not(result3.headers['x-request-id'], result1.headers['x-request-id'])
})

ava.serial('/api/v2/oauth should return 400 given an unknown oauth integration', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/oauth/helloworld/user-test')
	test.deepEqual(result, {
		code: 400,
		headers: result.headers,
		response: {
			url: null
		}
	})
})

ava.serial('should return 404 given a non existent attachment in a card', async (test) => {
	// The current user can always see its own session
	const result = await test.context.http(
		'GET', `/api/v2/file/${test.context.session}/fil_3e7h9zv`)
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: 'Not Found'
	})
})

ava.serial('should return 404 given an attachment in a non existent card', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/file/23cb39dc-f333-4197-b332-c46812abadf9/fil_3e7h9zv')
	test.deepEqual(result, {
		code: 404,
		headers: result.headers,
		response: 'Not Found'
	})
})

ava.serial('The ping endpoint should continuously work', async (test) => {
	const result1 = await test.context.http('GET', '/ping')
	test.is(result1.code, 200)
	test.false(result1.response.error)

	const result2 = await test.context.http('GET', '/ping')
	test.is(result2.code, 200)
	test.false(result2.response.error)

	const result3 = await test.context.http('GET', '/ping')
	test.is(result3.code, 200)
	test.false(result3.response.error)
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

	const user = await test.context.createUser(userDetails)

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

	const card = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, newUserId, {
			type: 'user'
		})

	test.deepEqual(card, test.context.jellyfish.defaults({
		created_at: card.created_at,
		linked_at: card.linked_at,
		updated_at: card.updated_at,
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
	}))
})

ava.serial('Users should be able to change their own email addresses', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)

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

ava.serial('Updating a user should not remove their org membership', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()
	const user = await test.context.createUser(userDetails)
	await sdk.auth.login(userDetails)

	const waitQuery = {
		type: 'object',
		$$links: {
			'is member of': {
				type: 'object',
				required: [ 'slug' ],
				properties: {
					slug: {
						type: 'string',
						const: 'org-balena'
					}
				}
			}
		},
		properties: {
			id: {
				type: 'string',
				const: user.id
			},
			type: {
				type: 'string',
				const: 'user'
			}
		},
		required: [ 'id', 'type' ],
		additionalProperties: true
	}

	const balenaOrg = await sdk.card.get('org-balena', {
		type: 'org'
	})

	await test.context.executeThenWait(() => {
		return sdk.card.link(balenaOrg, user, 'has member')
	}, waitQuery)

	const linkedUser = await sdk.auth.whoami()

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

	const updatedUser = await sdk.auth.whoami()

	test.deepEqual(updatedUser.links['is member of'], linkedUser.links['is member of'])
})

ava.serial('Users should not be able to view other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await test.context.createUser(createUserDetails())

	const activeUserDetails = createUserDetails()

	await test.context.createUser(activeUserDetails)
	await sdk.auth.login(activeUserDetails)

	const fetchedUser = await sdk.card.get(targetUser.id, {
		type: 'user'
	})

	test.is(fetchedUser.data.password, undefined)
})

ava.serial('.query() the guest user should only see its own private fields', async (test) => {
	await test.context.createUser({
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
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

ava.serial('.query() should be able to see previously restricted cards after an org change', async (test) => {
	const {
		sdk
	} = test.context

	const {
		jellyfish
	} = test.context.server
	const {
		defaults
	} = jellyfish

	const userDetails = createUserDetails()

	const user = await test.context.createUser(userDetails)

	test.truthy(user, 'User should be defined')
	await sdk.auth.login(userDetails)

	const orgCard = await jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'org-balena', {
			type: 'org'
		})

	test.truthy(orgCard, 'Org should exist')
	const entry = await jellyfish.insertCard(
		test.context.context, test.context.session, {
			markers: [ orgCard.slug ],
			type: 'support-issue',
			slug: test.context.generateRandomSlug({
				prefix: 'support-issue'
			}),
			version: '1.0.0',
			name: 'Test entry'
		})

	test.truthy(entry, 'Entry should be defined')
	const unprivilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.deepEqual(unprivilegedResults, null)

	await jellyfish.replaceCard(
		test.context.context, test.context.session, defaults({
			slug: `link-${orgCard.id}-has-member-${user.id}`,
			type: 'link',
			name: 'has member',
			data: {
				inverseName: 'is member of',
				from: {
					id: orgCard.id,
					type: orgCard.type
				},
				to: {
					id: user.id,
					type: user.type
				}
			}
		}))

	const privilegedResults = await sdk.card.get(entry.id, {
		type: 'support-issue'
	})

	test.truthy(privilegedResults)
	test.deepEqual(privilegedResults.id, entry.id)
})

ava.serial('timeline cards should reference the correct actor', async (test) => {
	const {
		sdk
	} = test.context
	const userDetails = createUserDetails()

	const user = await test.context.createUser(userDetails)

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

	await test.context.createUser(userDetails)

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

ava.serial('the guest user should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await test.context.createUser(createUserDetails())

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

	test.is(error.name, 'JellyfishNoElement')
})

ava.serial('users with the "user-community" role should not be able to change other users passwords', async (test) => {
	const {
		sdk
	} = test.context

	const targetUser = await test.context.createUser(createUserDetails())

	const communityUserDetails = createUserDetails()

	await test.context.createUser(communityUserDetails)

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

ava.serial('AGGREGATE($events): should work when creating cards via the SDK', async (test) => {
	const {
		sdk
	} = test.context

	const id = uuid()
	const userDetails = createUserDetails()

	// Create a new user
	await test.context.createUser(userDetails)

	// Login as the new user
	await sdk.auth.login(userDetails)

	// Create a new thread element
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		name: 'test-thread',
		data: {}
	})

	const waitQuery = {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'thread'
			},
			data: {
				type: 'object',
				properties: {
					mentionsUser: {
						type: 'array',
						contains: {
							type: 'string',
							const: id
						}
					}
				},
				required: [ 'mentionsUser' ]
			}
		},
		required: [ 'type', 'data' ]
	}

	const card = await test.context.executeThenWait(() => {
		return sdk.event.create({
			type: 'message',
			tags: [],
			target: thread,
			payload: {
				message: 'lorem ipsum dolor sit amet',
				mentionsUser: [ id ]
			}
		})
	}, waitQuery)

	test.deepEqual(card.data.mentionsUser, [ id ])
})

ava.serial('When updating a user, inaccessible fields should not be removed', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	// Create a new user
	const user = await test.context.createUser(userDetails)

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

	const rawUserCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, user.id, {
			type: 'user'
		})

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

	const role = 'user-community'

	const userData = createUserDetails()

	const user = await test.context.createUser(userData)

	await test.context.jellyfish.replaceCard(test.context.context,
		test.context.session,
		_.merge(user, {
			data: {
				roles: [ role ]
			}
		}))

	await sdk.auth.login(userData)

	const error2 = await test.throwsAsync(sdk.auth.login({
		username: 'admin'
	}))

	test.is(error2.name, 'WorkerAuthenticationError')
})

ava.serial('should post a dummy "none" event', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/none', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 200)
})

ava.serial('should not be able to post an unsupported external event', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/test', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

ava.serial('should add and evaluate a time triggered action', async (test) => {
	const {
		sdk
	} = test.context
	const {
		jellyfish
	} = test.context.server
	const {
		defaults
	} = jellyfish

	const typeCard = await jellyfish.getCardBySlug(test.context.context,
		test.context.session, 'card', {
			type: 'type'
		})

	const userDetails = createUserDetails()

	await test.context.createUser(userDetails)

	await sdk.auth.login(userDetails)

	const trigger = await jellyfish.replaceCard(
		test.context.context, test.context.session, defaults({
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				action: 'action-create-card',
				target: typeCard.id,
				interval: 'PT1S',
				arguments: {
					reason: null,
					properties: {
						version: '1.0.0',
						slug: {
							$eval: 'str(epoch)'
						},
						data: {
							origin: 'time-trigger'
						}
					}
				}
			}
		}))

	const waitUntilResults = async (length, times = 0) => {
		const results = await test.context.jellyfish.query(test.context.context, test.context.session, {
			type: 'object',
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'card'
				},
				data: {
					type: 'object',
					required: [ 'origin' ],
					properties: {
						origin: {
							type: 'string'
						}
					}
				}
			}
		})

		if (results.length >= length) {
			return results
		}

		if (times > 100) {
			throw new Error(`Did not get ${length} results in time`)
		}

		await Bluebird.delay(100)
		return waitUntilResults(length, times + 1)
	}

	const results = await waitUntilResults(3)
	test.true(results.length >= 3)

	await test.context.jellyfish.patchCardBySlug(
		test.context.context, test.context.session, trigger.slug, [
			{
				op: 'replace',
				path: '/active',
				value: false
			}
		], {
			type: trigger.type
		})
})

ava.serial('should be able to resolve links', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	await test.context.createUser(userDetails)

	await test.context.sdk.auth.login(userDetails)

	const id = uuid()
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		data: {
			uuid: id
		}
	})

	const messageRequest = await sdk.event.create({
		type: 'message',
		tags: [],
		target: thread,
		payload: {
			message: 'lorem ipsum dolor sit amet',
			mentionsUser: []
		}
	})

	const message = await sdk.card.get(messageRequest.id)

	const results = await sdk.query({
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'type', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'thread'
					},
					data: {
						additionalProperties: true,
						required: [ 'uuid' ],
						properties: {
							uuid: {
								type: 'string',
								const: id
							}
						}
					}
				},
				additionalProperties: false
			}
		},
		type: 'object',
		required: [ 'type', 'links' ],
		properties: {
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object'
			},
			slug: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			slug: message.slug,
			type: 'message',
			markers: [],
			links: {
				'is attached to': [
					{
						id: thread.id,
						type: 'thread',
						markers: [],
						data: {
							uuid: id
						}
					}
				]
			},
			data: message.data
		}
	])
})

ava.serial('.query() additionalProperties should not affect listing users as a new user', async (test) => {
	const id = uuid()
	await test.context.createUser(createUserDetails())
	const userDetails = createUserDetails()
	await test.context.createUser(userDetails)
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

	await test.context.createUser(user1Details)

	const targetUser = await test.context.createUser(createUserDetails())

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
		required: [ 'type', 'links', 'data' ],
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

ava.serial('should display up to date information after resolving an action', async (test) => {
	await test.context.sdk.setAuthToken(test.context.session)

	for (const time in _.range(0, 50)) {
		const card = await test.context.sdk.card.create({
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: `card-${time}`
			}),
			version: '1.0.0'
		})

		await test.context.sdk.card.remove(card.id, card.type)
		const result = await test.context.sdk.card.get(card.id, {
			type: 'card'
		})

		test.false(result.active)
	}
})

ava.serial('should fail with a user error given no input card', async (test) => {
	const result = await test.context.http('POST', '/api/v2/action', {
		type: 'user',
		action: 'action-create-session',
		arguments: {
			password: '1234'
		}
	})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'No input card'
	})
})

ava.serial('should fail with a user error given the wrong username during login', async (test) => {
	const result = await test.context.http('POST', '/api/v2/action', {
		card: 'user-nonexistentuser12345',
		type: 'user',
		action: 'action-create-session',
		arguments: {
			password: '1234'
		}
	})

	test.is(result.code, 400)
	test.true(result.response.error)
	test.is(result.response.data.name, 'WorkerAuthenticationError')
})

ava.serial('should prettify name when creating user contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					name: {
						first: 'john   ',
						last: '  dOE '
					}
				}
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

ava.serial('should link the contact to the user', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ]
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)

	await test.context.sdk.auth.loginWithToken(test.context.session)

	const results = await test.context.sdk.query({
		$$links: {
			'has contact': {
				type: 'object',
				required: [ 'id', 'slug', 'type' ],
				additionalProperties: false,
				properties: {
					id: {
						type: 'string'
					},
					slug: {
						type: 'string'
					},
					type: {
						type: 'string'
					}
				}
			}
		},
		type: 'object',
		required: [ 'id', 'type', 'links' ],
		properties: {
			id: {
				type: 'string',
				const: userCard.id
			},
			links: {
				type: 'object'
			},
			type: {
				type: 'string',
				const: userCard.type
			}
		}
	})

	test.is(results.length, 1)
	test.deepEqual(results[0].links['has contact'], [
		{
			id: result.response.data.id,
			slug: result.response.data.slug,
			type: result.response.data.type
		}
	])
})

ava.serial('should be able to sync updates to user first names', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer',
					name: {
						first: 'John'
					}
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/name/first',
						value: 'Johnny'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {
					first: 'Johnny'
				}
			}
		}
	})
})

ava.serial('should apply a user patch to a contact that diverged', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer'
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: result1.response.data.id,
			type: result1.response.data.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'remove',
						path: '/data/profile/title'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/title',
						value: 'Senior Frontend Engineer'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const result4 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result4.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result4.response.data.slug, {
			type: result4.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Senior Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should update the name of existing contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer'
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/name',
						value: 'John Doe'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: 'John Doe',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should delete an existing contact if the user is deleted', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer'
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: false,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should replace a property from an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer'
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/profile/title',
						value: 'Senior Frontend Engineer'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Senior Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should not remove a property from an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					title: 'Frontend Engineer'
				}
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'remove',
						path: '/data/profile/title'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend Engineer',
				name: {}
			}
		}
	})
})

ava.serial('should merge and relink a diverging contact with a matching slug', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				profile: {
					company: 'Balena'
				},
				roles: [ 'user-community' ]
			}
		})

	const contactCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: slug.replace(/^user-/, 'contact-'),
			name: '',
			type: 'contact',
			data: {
				profile: {
					email: 'janedoe@example.com',
					title: 'Frontend developer'
				}
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)
	test.is(result.response.data.id, contactCard.id)

	const newContactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(newContactCard, {
		id: contactCard.id,
		slug: contactCard.slug,
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: newContactCard.linked_at,
		created_at: newContactCard.created_at,
		updated_at: newContactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				title: 'Frontend developer',
				company: 'Balena'
			}
		}
	})
})

ava.serial('should add a property to an existing linked contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ]
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result1.response.error)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/profile',
						value: {}
					},
					{
						op: 'add',
						path: '/data/profile/company',
						value: 'Balena'
					}
				]
			}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result2.response.error)

	const result3 = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result3.response.error)

	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result3.response.data.slug, {
			type: result3.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				company: 'Balena',
				name: {}
			}
		}
	})
})

ava.serial('should create a contact for a user with little profile info', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ]
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should use the user name when creating a contact', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			name: 'John Doe',
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ]
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: 'John Doe',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should create an inactive contact given an inactive user', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			active: false,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ]
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: false,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				name: {}
			}
		}
	})
})

ava.serial('should create a contact for a user with plenty of info', async (test) => {
	const slug = test.context.generateRandomSlug({
		prefix: 'user'
	})

	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug,
			type: 'user',
			data: {
				email: 'johndoe@example.com',
				roles: [ 'user-community' ],
				profile: {
					company: 'Balena.io',
					title: 'Senior Directory of the Jellyfish Task Force',
					country: 'Republic of Balena',
					city: 'Contractshire',
					name: {
						first: 'John',
						last: 'Doe'
					}
				}
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: userCard.id,
			type: userCard.type,
			action: 'action-maintain-contact',
			arguments: {}
		}, {
			Authorization: `Bearer ${test.context.session}`
		})

	test.false(result.response.error)
	const contactCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, result.response.data.slug, {
			type: result.response.data.type
		})

	test.deepEqual(contactCard, {
		id: contactCard.id,
		slug: contactCard.slug.replace('user-', 'contact-'),
		name: '',
		tags: [],
		type: 'contact',
		links: {},
		active: true,
		markers: [],
		version: '1.0.0',
		requires: [],
		capabilities: [],
		linked_at: contactCard.linked_at,
		created_at: contactCard.created_at,
		updated_at: contactCard.updated_at,
		data: {
			profile: {
				email: 'johndoe@example.com',
				company: 'Balena.io',
				title: 'Senior Directory of the Jellyfish Task Force',
				country: 'Republic of Balena',
				city: 'Contractshire',
				name: {
					first: 'John',
					last: 'Doe'
				}
			}
		}
	})
})

ava.serial('should fail with a user error when querying an id with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'GET', '/api/v2/id/4a962ad9-20b5-4dd8-a707-bf819593cc84', null, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should get all elements by type', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'GET', '/api/v2/type/user', null, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 200)

	const users = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			required: [ 'type' ],
			additionalProperties: true,
			properties: {
				type: {
					type: 'string',
					const: 'user'
				}
			}
		})

	test.deepEqual(result.response, users)
})

ava.serial('should fail with a user error when querying a slug with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'GET', '/api/v2/slug/user-admin', null, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when querying with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/query', {
			type: 'object',
			additionalProperties: true,
			required: [ 'slug', 'type' ],
			properties: {
				slug: {
					type: 'string',
					const: 'user-admin'
				},
				type: {
					type: 'string',
					cons: 'user'
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when posting an action with an expired session', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id,
				expiration: '2015-04-10T23:00:00.000Z'
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user-nonexistentuser12345',
			type: 'user',
			action: 'action-create-session',
			arguments: {
				password: '1234'
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'JellyfishSessionExpired',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail when querying an invalid session with an invalid session', async (test) => {
	const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'

	const result = await test.context.http(
		'GET', `/api/v2/id/${session}`, null, {
			Authorization: `Bearer ${session}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'JellyfishInvalidSession',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error when executing an unknown action', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user-admin',
			type: 'user',
			action: 'action-foo-bar-baz-qux',
			arguments: {
				foo: 'bar'
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			context: result.response.data.context,
			name: 'WorkerInvalidAction',
			message: result.response.data.message
		}
	})
})

ava.serial('should fail with a user error given an arguments mismatch', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'user',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				foo: 'bar'
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: {
			name: 'WorkerSchemaMismatch',
			message: result.response.data.message
		}
	})
})

ava.serial('an update that renders a card invalid for its type is a user error', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const slug = `ping-test-${uuid()}`

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'ping',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						timestamp: new Date().toISOString()
					}
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result1.code, 200)

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: result1.response.data.id,
			type: result1.response.data.type,
			action: 'action-update-card',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/timestamp',
						value: 'foo'
					}
				]
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result2.code, 400)
	test.deepEqual(result2.response, {
		error: true,
		data: {
			name: 'JellyfishSchemaMismatch',
			message: result2.response.data.message
		}
	})
})

ava.serial('should fail with a user error if no action card type', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const slug = `ping-test-${uuid()}`

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'ping',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						timestamp: new Date().toISOString()
					}
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 400)
	test.deepEqual(result.response, {
		error: true,
		data: 'No action card type'
	})
})

ava.serial('should report a user error if creating the same event twice', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: 'foo bar baz',
			alertsUser: [],
			mentionsUser: []
		}
	}

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const result2 = await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result1.code, 200)
	test.is(result2.code, 400)
	test.deepEqual(result2.response, {
		error: true,
		data: {
			name: 'JellyfishElementAlreadyExists',
			message: result2.response.data.message
		}
	})
})

ava.serial('should respond with an error given a payload middleware exception', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const data = {}

	for (const time of _.range(0, 1000)) {
		data[`${time}-${uuid()}`] = {
			foo: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			bar: _.range(1, 10000),
			baz: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			xxx: 'foo bar baz qux foo bar baz qux foo bar baz qux',
			yyy: _.range(1, 10000),
			zzz: 'foo bar baz qux foo bar baz qux foo bar baz qux'
		}
	}

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'card',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					slug: test.context.generateRandomSlug({
						prefix: 'payload-test'
					}),
					version: '1.0.0',
					data
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.code, 413)
	test.deepEqual(result.response, {
		error: true,
		data: {
			expected: 98061078,
			expose: true,
			length: 98061078,
			limit: 5242880,
			ip: result.response.data.ip,
			url: '/api/v2/action',
			method: 'POST',
			name: 'PayloadTooLargeError',
			message: result.response.data.message,
			stack: result.response.data.stack,
			status: 413,
			statusCode: 413,
			type: 'entity.too.large'
		}
	})
})

ava.serial('should increment a card value using action-increment', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result1 = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'card',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					slug: test.context.generateRandomSlug({
						prefix: 'increment-test'
					})
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const card = result1.response.data

	await test.context.http(
		'POST', '/api/v2/action', {
			card: card.id,
			type: card.type,
			action: 'action-increment',
			arguments: {
				reason: null,
				path: [
					'data',
					'count'
				]
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const updatedCard1 = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, card.id, {
			type: 'card'
		})

	test.is(updatedCard1.data.count, 1)

	await test.context.http(
		'POST', '/api/v2/action', {
			card: card.id,
			type: card.type,
			action: 'action-increment',
			arguments: {
				reason: null,
				path: [
					'data',
					'count'
				]
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const updatedCard2 = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, card.id, {
			type: 'card'
		})

	test.is(updatedCard2.data.count, 2)
})

ava.serial('should create a new tag using using action-increment-tag', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const name = test.context.generateRandomSlug({
		prefix: 'increment-tag-test'
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.response.data.length, 1)

	const id = result.response.data[0].id

	const tag = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, id, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag'
	}))
})

ava.serial('action-increment-tag should not try two concurrent inserts', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const headers = {
		Authorization: `Bearer ${session.id}`
	}

	for (const time of _.range(10)) {
		const options = {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name: test.context.generateRandomSlug({
					prefix: `increment-tag-test-${time}`
				})
			}
		}

		const results = await Bluebird.all([
			test.context.http('POST', '/api/v2/action', options, headers),
			test.context.http('POST', '/api/v2/action', options, headers)
		])

		test.deepEqual(_.reject(results, {
			code: 200
		}), [])
	}
})

ava.serial('should increment an existing tag using using action-increment-tag', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const name = test.context.generateRandomSlug({
		prefix: 'increment-tag-test'
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					name,
					slug: `tag-${name}`,
					data: {
						count: 1
					}
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const id = result.response.data.id

	await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, id, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 2
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag',
		updated_at: tag.updated_at
	}))
})

ava.serial('should create a new tag when one is found in a message', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `#${tagName}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName}`, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: 'tag'
	}))
})

ava.serial('should sanely handle line breaks before tags in messages/whispers', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `\n#${tagName}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName}`, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: 'tag'
	}))
})

ava.serial('should sanely handle multiple tags in messages/whispers', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName1 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const tagName2 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const tagName3 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `#${tagName1}\n#${tagName2}\n#${tagName3}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag1 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName1}`, {
			type: 'tag'
		})

	const tag2 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName2}`, {
			type: 'tag'
		})

	const tag3 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName3}`, {
			type: 'tag'
		})

	test.deepEqual(tag1, test.context.jellyfish.defaults({
		created_at: tag1.created_at,
		data: {
			count: 1
		},
		id: tag1.id,
		linked_at: tag1.linked_at,
		name: tagName1,
		slug: tag1.slug,
		type: 'tag'
	}))

	test.deepEqual(tag2, test.context.jellyfish.defaults({
		created_at: tag2.created_at,
		data: {
			count: 1
		},
		id: tag2.id,
		linked_at: tag2.linked_at,
		name: tagName2,
		slug: tag2.slug,
		type: 'tag'
	}))

	test.deepEqual(tag3, test.context.jellyfish.defaults({
		created_at: tag3.created_at,
		data: {
			count: 1
		},
		id: tag3.id,
		linked_at: tag3.linked_at,
		name: tagName3,
		slug: tag3.slug,
		type: 'tag'
	}))
})

ava.serial('/query endpoint should allow you to query using a view\'s slug', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'POST',
		'/api/v2/query',
		{
			query: 'view-all-views'
		},
		{
			Authorization: `Bearer ${session.id}`
		}
	)

	test.is(result.code, 200)
	test.deepEqual(_.uniq(_.map(result.response.data, 'type')), [ 'view' ])
})

ava.serial('/query endpoint should allow you to query using a view\'s id', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const view = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'view-all-views', {
			type: 'view'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const result = await test.context.http(
		'POST',
		'/api/v2/query',
		{
			query: view.id
		},
		{
			Authorization: `Bearer ${session.id}`
		}
	)

	test.is(result.code, 200)
	test.deepEqual(_.uniq(_.map(result.response.data, 'type')), [ 'view' ])
})

ava.serial('Users should not be able to create sessions as other users', async (test) => {
	const {
		sdk
	} = test.context

	const user1Details = createUserDetails()

	await test.context.createUser(user1Details)

	const targetUser = await test.context.createUser(createUserDetails())

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

	await test.context.createUser(userDetails)

	await test.context.sdk.auth.login(userDetails)

	const error = await test.throwsAsync(async () => {
		await sdk.card.create(actionRequest)
	})

	test.is(error.name, 'JellyfishSchemaMismatch')
})

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
