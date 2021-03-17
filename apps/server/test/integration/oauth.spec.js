/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const querystring = require('querystring')
const {
	v4: uuid
} = require('uuid')
const environment = require('@balena/jellyfish-environment')
const {
	slugify
} = require('@balena/jellyfish-plugin-default/lib/integrations/utils')
const helpers = require('./helpers')

const outreachTest =
	environment.integration.outreach.appId &&
	environment.integration.outreach.appSecret &&
	environment.integration.outreach.signature
		? ava.serial
		: ava.serial.skip

const balenaApiTest =
	environment.integration['balena-api'].appId &&
	environment.integration['balena-api'].appSecret &&
	environment.integration['balena-api'].oauthBaseUrl
		? ava.serial
		: ava.serial.skip

ava.serial.before(async (test) => {
	await helpers.before(test)

	const scopes = [
		'prospects.all',
		'sequences.all',
		'sequenceStates.all',
		'sequenceSteps.all',
		'sequenceTemplates.all',
		'mailboxes.all',
		'webhooks.all'
	]

	const outreachClientSlug = test.context.generateRandomSlug({
		prefix: 'oauth-client-outreach'
	})

	test.context.outreachClient = await test.context.sdk.card.create({
		slug: outreachClientSlug,
		type: 'oauth-client',
		version: '1.0.0',
		name: 'Outreach oauth client',
		data: {
			clientId: environment.integration.outreach.appId,
			clientSecret: environment.integration.outreach.appSecret,
			scope: scopes.join('+'),
			redirectUrl: `${environment.oauth.redirectBaseUrl}/oauth/${outreachClientSlug}`
		}
	})

	const outreachProvider = await test.context.sdk.card.create({
		slug: test.context.generateRandomSlug({
			prefix: 'oauth-provider-outreach'
		}),
		type: 'oauth-provider',
		version: '1.0.0',
		name: 'Outreach oauth provider',
		data: {
			authorizeUrl: `https://api.outreach.io/oauth/authorize?client_id={{clientId}}&redirect_uri={{redirectUrl}}/oauth/${test.context.outreachClient.slug}&response_type=code&scope={{scope}}`,
			tokenUrl: 'https://api.outreach.io/oauth/token'
		}
	})

	await test.context.sdk.card.link(outreachProvider, test.context.outreachClient, 'has attached')

	const balenaClientSlug = test.context.generateRandomSlug({
		prefix: 'oauth-client-balena'
	})

	test.context.balenaClient = await test.context.sdk.card.create({
		slug: balenaClientSlug,
		type: 'oauth-client',
		version: '1.0.0',
		name: 'Balena oauth client',
		data: {
			clientId: environment.integration['balena-api'].appId,
			clientSecret: environment.integration['balena-api'].appSecret,
			redirectUrl: `${environment.oauth.redirectBaseUrl}/oauth/${balenaClientSlug}`
		}
	})

	const balenaProvider = await test.context.sdk.card.create({
		slug: test.context.generateRandomSlug({
			prefix: 'oauth-provider-balena-api'
		}),
		type: 'oauth-provider',
		version: '1.0.0',
		name: 'Balena oauth provider',
		data: {
			authorizeUrl: 'https://dashboard.balena-cloud.com/login/oauth/{{clientId}}',
			tokenUrl: 'https://api.balena-cloud.com/oauth/token',
			whoamiUrl: 'https://api.balena-cloud.com/user/v1/whoami',
			whoamiFieldMap: {
				username: [ 'username' ]
			}
		}
	})

	await test.context.sdk.card.link(balenaProvider, test.context.balenaClient, 'has attached')
})

ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

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
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.outreachClient.slug}`,
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
		'GET', `/oauth/${test.context.outreachClient.slug}?code=123456&state=${userCard.slug}`)

	test.is(result.code, 200)
	test.is(typeof result.response.access_token, 'string')
	test.is(result.response.token_type, 'Bearer')

	const newUserCard = await test.context.sdk.card.get(userCard.slug)

	test.deepEqual(newUserCard.data.oauth, {
		[test.context.outreachClient.slug]: {
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
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.outreachClient.slug}`,
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
		'GET', `/oauth/${test.context.outreachClient.slug}?code=999999999&state=${userCard.slug}`)

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
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.outreachClient.slug}`,
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
		'GET', `/oauth/${test.context.outreachClient.slug}?code=123456`)

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
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.outreachClient.slug}`,
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
		'GET', `/oauth/${test.context.outreachClient.slug}?code=123456&state=testtesttesttest`)

	test.is(result.code, 401)

	const newUserCard = await test.context.sdk.card.get(userCard.slug)
	test.falsy(newUserCard.data.oauth)
	nock.cleanAll()
})

balenaApiTest('should be able to associate a user with Balena Api', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			hash: 'PASSWORDLESS',
			roles: [ 'user-external-support' ]
		}
	})

	nock.cleanAll()

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.get('/user/v1/whoami')
		.reply(function (uri, request, callback) {
			callback(null, [ 200, {
				username: userCard.slug.substring('user-'.length)
			} ])
		})

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration['balena-api'].appId,
				client_secret: environment.integration['balena-api'].appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.balenaClient.slug}`,
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
		'GET', `/oauth/${test.context.balenaClient.slug}?code=123456&state=${userCard.slug}`)

	test.is(result.code, 200)
	test.is(typeof result.response.access_token, 'string')
	test.is(result.response.token_type, 'Bearer')

	const newUserCard = await test.context.sdk.card.get(userCard.slug)

	test.deepEqual(newUserCard.data.oauth, {
		[test.context.balenaClient.slug]: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create'
		}
	})

	nock.cleanAll()
})

balenaApiTest('should be able to associate a user with Balena Api with an unreliable whoami endpoint', async (test) => {
	const userCard = await test.context.sdk.card.create({
		type: 'user',
		slug: test.context.generateRandomSlug({
			prefix: 'user-oauth-test'
		}),
		version: '1.0.0',
		data: {
			email: 'test@jellysync.io',
			hash: 'PASSWORDLESS',
			roles: [ 'user-external-support' ]
		}
	})

	nock.cleanAll()

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.get('/user/v1/whoami')
		.reply(function (uri, request, callback) {
			callback(null, [ 429 ])
		})

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.get('/user/v1/whoami')
		.reply(function (uri, request, callback) {
			callback(null, [ 200, {
				username: userCard.slug.substring('user-'.length)
			} ])
		})

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration['balena-api'].appId,
				client_secret: environment.integration['balena-api'].appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.balenaClient.slug}`,
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
		'GET', `/oauth/${test.context.balenaClient.slug}?code=123456&state=${userCard.slug}`)

	test.is(result.code, 200)
	test.is(typeof result.response.access_token, 'string')
	test.is(result.response.token_type, 'Bearer')

	const newUserCard = await test.context.sdk.card.get(userCard.slug)

	test.deepEqual(newUserCard.data.oauth, {
		[test.context.balenaClient.slug]: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create'
		}
	})

	nock.cleanAll()
})

balenaApiTest('should be able to create a user if no matching user found and then associate it with Balena Api', async (test) => {
	const username = uuid()
	const slug = `user-${slugify(username)}`

	nock.cleanAll()

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.get('/user/v1/whoami')
		.reply(function (uri, request, callback) {
			callback(null, [ 200, {
				username
			} ])
		})

	await nock(environment.integration['balena-api'].oauthBaseUrl)
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: environment.integration['balena-api'].appId,
				client_secret: environment.integration['balena-api'].appSecret,
				redirect_uri: `${environment.oauth.redirectBaseUrl}/oauth/${test.context.balenaClient.slug}`,
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
		'GET', `/oauth/${test.context.balenaClient.slug}?code=123456&state=${slug}`)

	test.is(result.code, 200)
	test.is(typeof result.response.access_token, 'string')
	test.is(result.response.token_type, 'Bearer')

	const newUserCard = await test.context.sdk.card.get(slug)

	test.deepEqual(newUserCard.data.oauth, {
		[test.context.balenaClient.slug]: {
			access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
			token_type: 'bearer',
			expires_in: 3600,
			refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
			scope: 'create'
		}
	})

	nock.cleanAll()
})
