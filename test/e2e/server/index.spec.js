const environment = require('@balena/jellyfish-environment').defaultEnvironment
const ava = require('ava')
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')

let sdk = {}

ava.serial.before(async () => {
	sdk = await sdkHelpers.login()
})

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk)
})

ava.serial('should parse application/vnd.api+json bodies', async (test) => {
	const userDetails = helpers.generateUserDetails()
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
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

ava.serial('should login as the default test user', async (test) => {
	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: `user-${environment.test.user.username}@1.0.0`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: environment.test.user.password
			}
		})

	test.is(result.code, 200)
})

ava.serial('should include the request and api ids on responses', async (test) => {
	const userDetails = helpers.generateUserDetails()
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.is(result.code, 200)
	test.truthy(result.headers['x-request-id'])
	test.truthy(result.headers['x-api-id'])
})

ava.serial('should create different request ids for every response', async (test) => {
	const userDetails = helpers.generateUserDetails()
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const result1 = await helpers.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	const result2 = await helpers.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	const result3 = await helpers.http(
		'POST', '/api/v2/action', {
			card: `${user.slug}@${user.version}`,
			type: 'user',
			action: 'action-create-session@1.0.0',
			arguments: {
				password: userDetails.password
			}
		})

	test.not(result1.headers['x-request-id'], result2.headers['x-request-id'])
	test.not(result2.headers['x-request-id'], result3.headers['x-request-id'])
	test.not(result3.headers['x-request-id'], result1.headers['x-request-id'])
})

ava.serial('The ping endpoint should continuously work', async (test) => {
	const result1 = await helpers.http('GET', '/ping')
	test.is(result1.code, 200)
	test.false(result1.response.error)

	const result2 = await helpers.http('GET', '/ping')
	test.is(result2.code, 200)
	test.false(result2.response.error)

	const result3 = await helpers.http('GET', '/ping')
	test.is(result3.code, 200)
	test.false(result3.response.error)
})

ava.serial('should fail with a user error given no input card', async (test) => {
	const result = await helpers.http('POST', '/api/v2/action', {
		type: 'user',
		action: 'action-create-session@1.0.0',
		arguments: {
			password: '1234'
		}
	})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('should fail to query with single quotes JSON object', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST', '/api/v2/query', '{\'foo\':bar}', {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}, {
			json: false
		})

	test.is(result.code, 400)
	test.true(JSON.parse(result.response).error)
})

ava.serial('should fail to query with a non JSON string', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST', '/api/v2/query', 'foo:bar', {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('should fail to query with an invalid query object', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST', '/api/v2/query', {
			foo: 'bar'
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('should get all elements by type', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'GET', '/api/v2/type/user', null, {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 200)

	const users = await sdk.query({
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user@1.0.0'
			}
		}
	})

	test.is(result.response.length, users.length)
	test.deepEqual(result.response, users)
})

ava.serial('should fail with a user error when executing an unknown action', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'user-admin@1.0.0',
			type: 'user',
			action: 'action-foo-bar-baz-qux@1.0.0',
			arguments: {
				foo: 'bar'
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('should fail with a user error given an arguments mismatch', async (test) => {
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'user@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				foo: 'bar'
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('an update that renders a card invalid for its type is a user error', async (test) => {
	const token = sdk.getAuthToken()
	const slug = `ping-test-${uuid()}`

	const result1 = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'ping@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
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
			Authorization: `Bearer ${token}`
		})

	test.is(result1.code, 200)

	const result2 = await helpers.http(
		'POST', '/api/v2/action', {
			card: result1.response.data.id,
			type: result1.response.data.type,
			action: 'action-update-card@1.0.0',
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
			Authorization: `Bearer ${token}`
		})

	test.is(result2.code, 400)
	test.true(result2.response.error)
})

ava.serial('should fail with a user error if no action card type', async (test) => {
	const token = sdk.getAuthToken()
	const slug = `ping-test-${uuid()}`

	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'ping@1.0.0',
			action: 'action-create-card@1.0.0',
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
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 400)
	test.true(result.response.error)
})

ava.serial('should report a user error if creating the same event twice', async (test) => {
	const token = sdk.getAuthToken()

	const thread = await sdk.card.create({
		type: 'card',
		slug: helpers.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		data: {}
	})

	const args = {
		slug: helpers.generateRandomSlug({
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

	const result1 = await helpers.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event@1.0.0',
			arguments: args
		}, {
			Authorization: `Bearer ${token}`
		})

	const result2 = await helpers.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event@1.0.0',
			arguments: args
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result1.code, 200)
	test.is(result2.code, 400)
	test.true(result2.response.error)
	test.is(result2.response.data.slug, args.slug)
})

ava.serial('should respond with an error given a payload middleware exception', async (test) => {
	const token = sdk.getAuthToken()
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

	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'card@1.0.0',
			type: 'type',
			action: 'action-create-card@1.0.0',
			arguments: {
				reason: null,
				properties: {
					slug: helpers.generateRandomSlug({
						prefix: 'payload-test'
					}),
					version: '1.0.0',
					data
				}
			}
		}, {
			Authorization: `Bearer ${token}`
		})

	test.is(result.code, 413)
	test.deepEqual(result.response, {
		error: true,
		data: {
			expected: 98061090,
			expose: true,
			length: 98061090,
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
	const token = sdk.getAuthToken()
	const result = await helpers.http(
		'POST',
		'/api/v2/query',
		{
			query: 'view-all-views'
		},
		{
			Authorization: `Bearer ${token}`
		}
	)

	test.is(result.code, 200)
	test.deepEqual(_.uniq(_.map(result.response.data, (card) => {
		return _.first(card.type.split('@'))
	})), [ 'view' ])
})

ava.serial('/query endpoint should allow you to query using a view\'s id', async (test) => {
	const token = sdk.getAuthToken()
	const view = await sdk.card.get('view-all-views')
	const result = await helpers.http(
		'POST',
		'/api/v2/query',
		{
			query: view.id
		},
		{
			Authorization: `Bearer ${token}`
		}
	)

	test.is(result.code, 200)
	test.deepEqual(_.uniq(_.map(result.response.data, (card) => {
		return _.first(card.type.split('@'))
	})), [ 'view' ])
})

ava.serial('whoami should respond even if user has little permissions', async (test) => {
	const roleSlug = helpers.generateRandomSlug({
		prefix: 'role-user'
	})

	await sdk.action({
		card: 'role@1.0.0',
		type: 'type',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				slug: roleSlug,
				version: '1.0.0',
				data: {
					read: {
						type: 'object',
						additionalProperties: false,
						required: [ 'id', 'slug', 'type' ],
						properties: {
							id: {
								type: 'string'
							},
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								enum: [ 'session@1.0.0', 'user@1.0.0' ]
							}
						}
					}
				}
			}
		}
	})

	const userDetails = helpers.generateUserDetails()
	const user = await sdk.action({
		card: 'user@1.0.0',
		type: 'type',
		action: 'action-create-user@1.0.0',
		arguments: {
			username: `user-${userDetails.username}`,
			email: userDetails.email,
			password: userDetails.password
		}
	})

	const session = await sdk.card.create({
		type: 'session@1.0.0',
		slug: helpers.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: user.id
		}
	})

	await sdk.card.update(user.id, user.type, [
		{
			op: 'replace',
			path: '/data/roles',
			value: [ roleSlug.replace(/^role-/, '') ]
		}
	])

	const result = await helpers.http(
		'GET',
		'/api/v2/whoami',
		{},
		{
			Authorization: `Bearer ${session.id}`
		}
	)

	test.false(result.response.error)
	test.is(result.response.data.id, user.id)
})
