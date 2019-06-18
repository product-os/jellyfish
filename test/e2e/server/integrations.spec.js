/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const crypto = require('crypto')
const querystring = require('querystring')
const nock = require('nock')
const _ = require('lodash')
const helpers = require('../sdk/helpers')
const environment = require('../../../lib/environment')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
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
	const card = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, requestResult.data.id, {
			type: 'external-event'
		})

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
	environment.integration.outreach.appSecret
		? ava.serial
		: ava.serial.skip

outreachTest('/api/v2/oauth should return a url given outreach', async (test) => {
	const result = await test.context.http(
		'GET', '/api/v2/oauth/outreach/user-test')

	const redirectUri = `${environment.oauth.redirectBaseUrl}/oauth/outreach`
	const qs = [
		'response_type=code',
		`client_id=${environment.integration.outreach.appId}`,
		`redirect_uri=${encodeURIComponent(redirectUri)}`,
		'scope=prospects.all',
		'state=user-test'
	].join('&')
	test.deepEqual(result, {
		code: 200,
		response: {
			url: `https://api.outreach.io/oauth/authorize?${qs}`
		}
	})
})

outreachTest('should be able to associate a user with Outreach', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
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
		response: {
			error: false,
			slug: userCard.slug
		}
	})

	const newUserCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, userCard.slug, {
			type: userCard.type
		})

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
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
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
		response: {
			error: true,
			data: {
				message: result.response.data.message,
				name: 'OAuthUnsuccessfulResponse'
			}
		}
	})

	const newUserCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, userCard.slug, {
			type: userCard.type
		})

	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})

outreachTest('should not be able to associate a user with Outreach given no state', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
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

	const newUserCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, userCard.slug, {
			type: userCard.type
		})

	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})

outreachTest('should not be able to associate a user with Outreach given an invalid state', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
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

	const newUserCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, userCard.slug, {
			type: userCard.type
		})

	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})
