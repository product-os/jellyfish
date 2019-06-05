/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const randomstring = require('randomstring')
const jws = require('jsonwebtoken')
const jose = require('node-jose')
const sync = require('../../../lib/sync')

ava('.isValidEvent() should return true for Front given anything', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxxxx'
	}, 'front', '....', {})
	test.true(result)
})

ava('.isValidEvent() should return false for an unknown integration', async (test) => {
	const result = await sync.isValidEvent(
		null, 'helloworld', '....', {})
	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and no signature header', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '....', {})
	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and a signature but no key', async (test) => {
	const result = await sync.isValidEvent(null, 'github', '....', {
		'x-hub-signature': 'sha1=aaaabbbbcccc'
	})

	test.false(result)
})

ava('.isValidEvent() should return false given GitHub and a signature mismatch', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '{"foo":"bar"}', {
		'x-hub-signature': 'sha1=foobarbaz'
	})

	test.false(result)
})

ava('.isValidEvent() should return true given GitHub and a signature match', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'github', '{"foo":"bar"}', {
		'x-hub-signature': 'sha1=52b582138706ac0c597c315cfc1a1bf177408a4d'
	})

	test.true(result)
})

ava('.isValidEvent() should return true given Discourse and no signature header', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '....', {})
	test.true(result)
})

ava('.isValidEvent() should return false given Discourse and a signature but no key', async (test) => {
	const result = await sync.isValidEvent(null, 'discourse', '....', {
		'x-discourse-event-signature': 'sha256=aaaabbbbcccc'
	})

	test.false(result)
})

ava('.isValidEvent() should return false given Discourse and a signature mismatch', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '{"foo":"bar"}', {
		'x-discourse-event-signature': 'sha256=foobarbaz'
	})

	test.false(result)
})

ava('.isValidEvent() should return true given Discourse and a signature match', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		signature: 'secret'
	}, 'discourse', '{"foo":"bar"}', {
		'x-discourse-event-signature': 'sha256=3f3ab3986b656abb17af3eb1443ed6c08ef8fff9fea83915909d1b421aec89be'
	})

	test.true(result)
})

// eslint-disable-next-line max-len
const TEST_BALENA_API_PRIVATE_KEY = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0lGM1M3TkNkV1MyZXJEU0YKbEcxSnBFTEZid0pNckVURUR0d3ZRMFVSUFh5aFJBTkNBQVNDR1pPcmhZTmhoY1c5YTd5OHNTNStINVFFY2tEaApGK0ZVZUV4Si9UcEtCS256RVBMNVBGNGt0L0JwZVlFNmpoQ3UvUmpjWEhXdE1DOXdRTGpQU1ZXaQotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg=='
// eslint-disable-next-line max-len
const TEST_BALENA_API_PUBLIC_KEY = 'LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFZ2htVHE0V0RZWVhGdld1OHZMRXVmaCtVQkhKQQo0UmZoVkhoTVNmMDZTZ1NwOHhEeStUeGVKTGZ3YVhtQk9vNFFydjBZM0Z4MXJUQXZjRUM0ejBsVm9nPT0KLS0tLS1FTkQgUFVCTElDIEtFWS0tLS0tCg=='

ava('.isValidEvent() should return false given Balena API and invalid JSON', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		publicKey: TEST_BALENA_API_PUBLIC_KEY,
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, 'balena-api', '{"foo":"bar"}', {
		'content-type': 'application/jose'
	})
	test.false(result)
})

ava('.isValidEvent() should return false given Balena API and invalid payload', async (test) => {
	const result = await sync.isValidEvent({
		api: 'xxxxx',
		publicKey: TEST_BALENA_API_PUBLIC_KEY,
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, 'balena-api', 'xxxxxxxxxxxxxx', {
		'content-type': 'application/jose'
	})
	test.false(result)
})

const encryptPayload = async (payload) => {
	const signedToken = jws.sign({
		data: payload
	}, Buffer.from(TEST_BALENA_API_PRIVATE_KEY, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: `${payload.id}`
	})

	const keyValue = Buffer.from(TEST_BALENA_API_PUBLIC_KEY, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)

	const result = await cipher.final()
	return result
}

ava('.isValidEvent() should return true given Balena API and a key match', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent({
		api: 'xxxxx',
		publicKey: TEST_BALENA_API_PUBLIC_KEY,
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, 'balena-api', payload, {
		'content-type': 'application/jose'
	})

	test.true(result)
})

ava('.isValidEvent() should return false given Balena API and no public key', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent({
		api: 'xxxxx',
		privateKey: TEST_BALENA_API_PRIVATE_KEY
	}, 'balena-api', payload, {
		'content-type': 'application/jose'
	})

	test.false(result)
})

ava('.isValidEvent() should return true given Balena API and no private key', async (test) => {
	const payload = await encryptPayload({
		id: 666,
		foo: 'bar'
	})

	const result = await sync.isValidEvent({
		api: 'xxxxx',
		publicKey: TEST_BALENA_API_PUBLIC_KEY
	}, 'balena-api', payload, {
		'content-type': 'application/jose'
	})

	test.false(result)
})
