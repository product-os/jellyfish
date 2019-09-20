/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const crypto = require('crypto')
const querystring = require('querystring')
const jose = require('node-jose')
const uuid = require('uuid/v4')
const randomstring = require('randomstring')
const jws = require('jsonwebtoken')
const nock = require('nock')
const _ = require('lodash')
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

	const requestResult = await test.context.queue.waitResults(
		test.context.context, result.response.data)

	test.false(requestResult.error)
	const card = await test.context.sdk.card.get(requestResult.data.id)

	test.deepEqual(card, {
		created_at: card.created_at,
		updated_at: null,
		linked_at: card.linked_at,
		id: requestResult.data.id,
		type: 'external-event',
		slug: requestResult.data.slug,
		name: null,
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: card.links,
		requires: [],
		capabilities: [],
		data: {
			source: 'github',
			headers: {
				accept: 'application/json',
				connection: 'close',
				'content-length': '42',
				'content-type': 'application/json',
				host: `localhost:${test.context.server.port}`,
				'x-hub-signature': `sha1=${hash}`
			},
			payload: {
				foo: 'bar',
				sender: {
					login: 'johndoe'
				}
			}
		}
	})
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

outreachTest('should be able to associate a user with Outreach', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			roles: [ 'user-community' ]
		}
	})

	nock.cleanAll()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration.outreach.appId,
				client_secret: environment.integration.outreach.appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await test.context.http(
		'GET', `/oauth/outreach?code=123456&state=${userCard.slug}`)

	test.deepEqual(result, {
		code: 200,
		headers: result.headers,
		response: {
			error: false,
			slug: userCard.slug
		}
	})

	const newUserCard = await test.context.sdk.card.get(userCard.slug)

	test.deepEqual(newUserCard.data.oauth, {
		outreach: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create'
		}
	})

	nock.cleanAll()
})

outreachTest('should not be able to associate a user with Outreach given the wrong code', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			roles: [ 'user-community' ]
		}
	})

	nock.cleanAll()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration.outreach.appId,
				client_secret: environment.integration.outreach.appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await test.context.http(
		'GET', `/oauth/outreach?code=999999999&state=${userCard.slug}`)

	test.deepEqual(result, {
		code: 401,
		headers: result.headers,
		response: {
			error: true,
			data: {
				message: result.response.data.message,
				name: 'OAuthUnsuccessfulResponse'
			}
		}
	})

	const newUserCard = await test.context.sdk.card.get(userCard.slug)
	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})

outreachTest('should not be able to associate a user with Outreach given no state', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			roles: [ 'user-community' ]
		}
	})

	nock.cleanAll()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration.outreach.appId,
				client_secret: environment.integration.outreach.appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await test.context.http(
		'GET', '/oauth/outreach?code=123456')

	test.is(result.code, 401)

	const newUserCard = await test.context.sdk.card.get(userCard.slug)
	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})

outreachTest('should not be able to associate a user with Outreach given an invalid state', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			roles: [ 'user-community' ]
		}
	})

	nock.cleanAll()

	await nock('https://api.outreach.io')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration.outreach.appId,
				client_secret: environment.integration.outreach.appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/outreach`,
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await test.context.http(
		'GET', '/oauth/outreach?code=123456&state=testtesttesttest')

	test.is(result.code, 401)

	const newUserCard = await test.context.sdk.card.get(userCard.slug)
	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})
