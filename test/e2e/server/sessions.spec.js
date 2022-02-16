const ava = require('ava')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')

let sdk = {}

ava.serial.before(async () => {
	sdk = await sdkHelpers.login()
})

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk)
})

ava.serial('should fail with a user error when querying an id with an expired session', async (test) => {
	const admin = await sdk.card.get('user-admin')

	const session = await sdk.card.create({
		type: 'session',
		slug: helpers.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: admin.id,
			expiration: '2015-04-10T23:00:00.000Z'
		}
	})

	const result = await helpers.http(
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
	const admin = await sdk.card.get('user-admin')

	const session = await sdk.card.create({
		type: 'session',
		slug: helpers.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: admin.id,
			expiration: '2015-04-10T23:00:00.000Z'
		}
	})

	const result = await helpers.http(
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
	const admin = await sdk.card.get('user-admin')

	const session = await sdk.card.create({
		type: 'session',
		slug: helpers.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: admin.id,
			expiration: '2015-04-10T23:00:00.000Z'
		}
	})

	const result = await helpers.http(
		'POST', '/api/v2/query', {
			query: {
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

ava.serial('should fail with a user error when posting an action with an expired session', async (test) => {
	const admin = await sdk.card.get('user-admin')

	const session = await sdk.card.create({
		type: 'session',
		slug: helpers.generateRandomSlug({
			prefix: 'session'
		}),
		version: '1.0.0',
		data: {
			actor: admin.id,
			expiration: '2015-04-10T23:00:00.000Z'
		}
	})

	const result = await helpers.http(
		'POST', '/api/v2/action', {
			card: 'user-nonexistentuser12345@1.0.0',
			type: 'user',
			action: 'action-create-session@1.0.0',
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

ava.serial('should fail with a 404 when querying an invalid session with an invalid session', async (test) => {
	const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'

	const result = await helpers.http(
		'GET', `/api/v2/id/${session}`, null, {
			Authorization: `Bearer ${session}`
		})

	// When an invalid session ID is provided in the request,
	// the guest session will be used by the server to authenticate
	// any calls to Jellyfish core. Therefore, if the queried ID is
	// invalid/does not exist, and the guest session has read access
	// to it, a 404 should be returned.
	test.is(result.code, 404)
})
