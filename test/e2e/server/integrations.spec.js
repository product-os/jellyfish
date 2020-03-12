/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const crypto = require('crypto')
const jose = require('node-jose')
const uuid = require('uuid/v4')
const randomstring = require('randomstring')
const jws = require('jsonwebtoken')
const _ = require('lodash')
const helpers = require('../client-sdk/helpers')
const environment = require('../../../lib/environment')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

const balenaAvaTest = _.some(_.values(environment.integration['balena-api']), _.isEmpty)
	? ava.skip
	: ava.serial

balenaAvaTest('should take application/jose balena-api webhooks', async (test) => {
	const token = environment.integration['balena-api']
	const object = {
		test: 1
	}

	const signedToken = jws.sign({
		data: object
	}, Buffer.from(token.privateKey, 'base64'), {
		algorithm: 'ES256',
		expiresIn: 10 * 60 * 1000,
		audience: 'jellyfish',
		issuer: 'api.balena-cloud.com',
		jwtid: randomstring.generate(20),
		subject: uuid()
	})

	const keyValue = Buffer.from(token.production.publicKey, 'base64')
	const encryptionKey = await jose.JWK.asKey(keyValue, 'pem')

	const cipher = jose.JWE.createEncrypt({
		format: 'compact'
	}, encryptionKey)
	cipher.update(signedToken)
	const string = await cipher.final()

	const result = await test.context.http(
		'POST', '/api/v2/hooks/balena-api', string, {
			'Content-Type': 'application/jose'
		}, {
			json: false
		})

	test.is(result.code, 200)
	const response = JSON.parse(result.response)
	test.false(response.error)
})

const githubAvaTest = _.some(_.values(environment.integration.github), _.isEmpty)
	? ava.skip
	: ava.serial

githubAvaTest('should not be able to post a GitHub event without a signature', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/github', {
		foo: 'bar',
		bar: 'baz',
		sender: {
			login: 'johndoe'
		}
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

githubAvaTest('should take a GitHub event with a valid signature', async (test) => {
	const object = '{"foo":"bar","sender":{"login":"johndoe"}}'
	const hash = crypto.createHmac('sha1', environment.integration.github.signature)
		.update(object)
		.digest('hex')

	const result = await test.context.http('POST', '/api/v2/hooks/github', JSON.parse(object), {
		'x-hub-signature': `sha1=${hash}`
	})

	test.is(result.code, 200)
	test.false(result.response.error)
})

ava.serial('should not ignore a GitHub signature mismatch', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/github', {
		foo: 'bar',
		bar: 'baz'
	}, {
		'x-hub-signature': 'sha1=xxxxxxxxxxxxxxx'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret &&
	environment.integration.outreach.signature
		? ava.serial
		: ava.serial.skip

outreachTest('should not be able to post an Outreach event without a signature', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/outreach', {
		foo: 'bar',
		bar: 'baz'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

outreachTest('should take an Outreach event with a valid signature', async (test) => {
	// eslint-disable-next-line max-len
	const object = '{"data":{"type":"sequence","id":54,"attributes":{"updatedAt":"2019-08-15T19:52:07.000Z","throttleMaxAddsPerDay":70},"relationships":{}},"meta":{"deliveredAt":"2019-08-15T19:52:07.697+00:00","eventName":"sequence.updated"}}'
	const hash = crypto.createHmac('sha256', environment.integration.outreach.signature)
		.update(object)
		.digest('hex')

	const result = await test.context.http('POST', '/api/v2/hooks/outreach', JSON.parse(object), {
		'outreach-webhook-signature': hash
	})

	test.is(result.code, 200)
	test.false(result.response.error)
})

ava.serial('should not ignore an Outreach signature mismatch', async (test) => {
	const result = await test.context.http('POST', '/api/v2/hooks/outreach', {
		foo: 'bar',
		bar: 'baz'
	}, {
		'outreach-webhook-signature': 'xxxxxxxxxxxxxxx'
	})

	test.is(result.code, 401)
	test.true(result.response.error)
})

outreachTest('/api/v2/oauth should return a url given outreach', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/oauth/outreach/user-test')

	const redirectUri = `${environment.oauth.redirectBaseUrl}/oauth/outreach`
	const qs = [
		'response_type=code',
		`client_id=${environment.integration.outreach.appId}`,
		`redirect_uri=${encodeURIComponent(redirectUri)}`,
		'scope=prospects.all+sequences.all+sequenceStates.all+sequenceSteps.all+sequenceTemplates.all+mailboxes.all+webhooks.all',
		'state=user-test'
	].join('&')
	test.deepEqual(result, {
		code: 200,
		headers: result.headers,
		response: {
			url: `https://api.outreach.io/oauth/authorize?${qs}`
		}
	})
})
