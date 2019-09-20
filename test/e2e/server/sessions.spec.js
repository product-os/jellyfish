/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

ava.before(async (test) => {
	await helpers.sdk.before(test)

	const session = await test.context.sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})

	test.context.token = session.id
})

ava.after(helpers.sdk.after)

ava.beforeEach(async (test) => {
	await helpers.sdk.beforeEach(test, test.context.token)
})

ava.afterEach(helpers.sdk.afterEach)

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

ava.serial('should fail with a user error when querying an id with an expired session', async (test) => {
	const admin = await test.context.sdk.card.get('user-admin')

	const session = await test.context.sdk.card.create({
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

ava.serial('should fail with a user error when querying a slug with an expired session', async (test) => {
	const admin = await test.context.sdk.card.get('user-admin')

	const session = await test.context.sdk.card.create({
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
	const admin = await test.context.sdk.card.get('user-admin')

	const session = await test.context.sdk.card.create({
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
	const admin = await test.context.sdk.card.get('user-admin')

	const session = await test.context.sdk.card.create({
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
