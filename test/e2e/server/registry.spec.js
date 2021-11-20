const ava = require('ava')
const jsonwebtoken = require('jsonwebtoken')
const {
	v4: uuid
} = require('uuid')
const helpers = require('../sdk/helpers')

const {
	REGISTRY_TOKEN_AUTH_CERT_KEY

// eslint-disable-next-line no-process-env
} = process.env

const b64decode = (str) => {
	return Buffer.from(str, 'base64').toString().trim()
}

const b64encode = (str) => {
	return Buffer.from(str).toString('base64')
}

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

ava.serial('/api/v2/registry should return 400 if the token isn\'t present', async (test) => {
	const actor = await test.context.sdk.auth.whoami()
	const b64Auth = b64encode(`${actor.slug}`)

	const result = await test.context.http(
		'GET',
		'/api/v2/registry',
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)
	test.is(result.code, 400)
})

ava.serial('/api/v2/registry should return 401 if the user isn\'t valid', async (test) => {
	const token = test.context.sdk.getAuthToken()
	const b64Auth = b64encode(`user-${uuid()}:${token}`)

	const result = await test.context.http(
		'GET',
		'/api/v2/registry',
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)
	test.is(result.code, 401)
})

ava.serial('/api/v2/registry should return 401 if the token isn\'t valid', async (test) => {
	const actor = await test.context.sdk.auth.whoami()
	const b64Auth = b64encode(`${actor.slug}:${uuid()}`)

	const result = await test.context.http(
		'GET',
		'/api/v2/registry',
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)
	test.is(result.code, 401)
})

ava.serial('/api/v2/registry should return a JWT with no scope (this happens on "docker login")', async (test) => {
	const actor = await test.context.sdk.auth.whoami()
	const token = test.context.sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)

	const result = await test.context.http(
		'GET',
		`/api/v2/registry?account=${actor.slug}&client_id=docker&offline_token=true&service=registry.ly.fish.local`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_KEY), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 0, 'The access array should be empty')
})

ava.serial('/api/v2/registry should return a JWT with empty access permissions if the scope is not accessible', async (test) => {
	const actor = await test.context.sdk.auth.whoami()
	const token = test.context.sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)
	const bogusId = uuid()

	const result = await test.context.http(
		'GET',
		`/api/v2/registry?account=${actor.slug}&scope=repository%3A${bogusId}%3Apush%2Cpull&service=registry.ly.fish.local`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_KEY), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 0, 'The access array should be empty')
})

ava.serial('/api/v2/registry should return a JWT with correct access permissions when a scope is set', async (test) => {
	const actor = await test.context.sdk.auth.whoami()
	const token = test.context.sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)
	const thread = await test.context.sdk.card.create({
		type: 'thread'
	})

	const result = await test.context.http(
		'GET',
		`/api/v2/registry?account=${actor.slug}&scope=repository%3A${thread.slug}%3Apush%2Cpull&service=registry.ly.fish.local`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_KEY), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 1, 'The access array should contain 1 entry')
	test.is(decoded.access[0].name, thread.slug, 'Access should be provided to the card slug')
	test.deepEqual(decoded.access[0].actions, [ 'push', 'pull' ], 'Pull and push actions should be authorized')
})
