/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const _ = require('lodash')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

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

if (environment.isProduction()) {
	ava.serial('should not login as the default test user', async (test) => {
		const result = await test.context.http(
			'POST', '/api/v2/action', {
				card: `user-${environment.test.user.username}`,
				type: 'user',
				action: 'action-create-session',
				arguments: {
					password: environment.test.user.password
				}
			})

		test.is(result.code, 400)
	})
} else {
	ava.serial('should login as the default test user', async (test) => {
		const result = await test.context.http(
			'POST', '/api/v2/action', {
				card: `user-${environment.test.user.username}`,
				type: 'user',
				action: 'action-create-session',
				arguments: {
					password: environment.test.user.password
				}
			})

		test.is(result.code, 200)
	})
}

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
			headers: result.response.data.headers,
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
