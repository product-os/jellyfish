const environment = require('@balena/jellyfish-environment').defaultEnvironment
const ava = require('ava')
const jsonwebtoken = require('jsonwebtoken')
const {
	v4: uuid
} = require('uuid')
const sdkHelpers = require('../sdk/helpers')
const helpers = require('./helpers')

let sdk = {}
const {
	REGISTRY_TOKEN_AUTH_CERT_PUB,
	REGISTRY2_HOST

// eslint-disable-next-line no-process-env
} = process.env

const b64decode = (str) => {
	return Buffer.from(str, 'base64').toString().trim()
}

const b64encode = (str) => {
	return Buffer.from(str).toString('base64')
}

ava.serial.before(async () => {
	sdk = await sdkHelpers.login()
})

ava.serial.afterEach(() => {
	sdkHelpers.afterEach(sdk)
})

ava.serial('/api/v2/registry should return 400 if the token isn\'t present', async (test) => {
	const actor = await sdk.auth.whoami()
	const b64Auth = b64encode(`${actor.slug}`)

	const result = await helpers.http(
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
	const token = sdk.getAuthToken()
	const b64Auth = b64encode(`user-${uuid()}:${token}`)

	const result = await helpers.http(
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
	const actor = await sdk.auth.whoami()
	const b64Auth = b64encode(`${actor.slug}:${uuid()}`)

	const result = await helpers.http(
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
	console.log('=== REGISTRY_TOKEN_AUTH_CERT_PUB:', REGISTRY_TOKEN_AUTH_CERT_PUB)
	console.log('=== REGISTRY2_HOST:', REGISTRY2_HOST)
	console.log('=== environment.registry:', JSON.stringify(environment.registry, null, 4))
	const actor = await sdk.auth.whoami()
	const token = sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)

	const result = await helpers.http(
		'GET',
		// eslint-disable-next-line max-len
		`/api/v2/registry?account=${actor.slug}&client_id=docker&offline_token=true&service=${REGISTRY2_HOST}`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	// Signature verification requires a public key.
	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_PUB), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 0, 'The access array should be empty')
})

ava.serial('/api/v2/registry should return a JWT with empty access permissions if the scope is not accessible', async (test) => {
	const actor = await sdk.auth.whoami()
	const token = sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)
	const bogusId = uuid()

	const result = await helpers.http(
		'GET',
		// eslint-disable-next-line max-len
		`/api/v2/registry?account=${actor.slug}&scope=repository%3A${bogusId}%3Apush%2Cpull&service=${REGISTRY2_HOST}`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_PUB), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 0, 'The access array should be empty')
})

ava.serial('/api/v2/registry should return a JWT with correct access permissions when a scope is set', async (test) => {
	const actor = await sdk.auth.whoami()
	const token = sdk.getAuthToken()
	const b64Auth = b64encode(`${actor.slug}:${token}`)
	const thread = await sdk.card.create({
		type: 'thread'
	})

	const result = await helpers.http(
		'GET',
		// eslint-disable-next-line max-len
		`/api/v2/registry?account=${actor.slug}&scope=repository%3A${thread.slug}%3Apush%2Cpull&service=${REGISTRY2_HOST}`,
		null,
		{
			authorization: `Basic ${b64Auth}`
		}
	)

	test.is(result.code, 200)
	test.assert(result.response.token, 'A token key was returned from the API')

	const decoded = jsonwebtoken.verify(result.response.token, b64decode(REGISTRY_TOKEN_AUTH_CERT_PUB), {
		algorithms: [ 'ES256' ]
	})

	test.is(decoded.access.length, 1, 'The access array should contain 1 entry')
	test.is(decoded.access[0].name, thread.slug, 'Access should be provided to the card slug')
	test.deepEqual(decoded.access[0].actions, [ 'push', 'pull' ], 'Pull and push actions should be authorized')
})
