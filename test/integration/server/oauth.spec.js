/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const querystring = require('querystring')
const environment = require('../../../lib/environment')
const helpers = require('./helpers')

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret &&
	environment.integration.outreach.signature
		? ava.serial
		: ava.serial.skip

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

outreachTest('should be able to associate a user with Outreach', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			hash: 'PASSWORDLESS',
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
			hash: 'PASSWORDLESS',
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
			hash: 'PASSWORDLESS',
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
			hash: 'PASSWORDLESS',
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
