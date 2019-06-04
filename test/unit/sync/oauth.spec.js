/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const nock = require('nock')
const querystring = require('querystring')
const oauth = require('../../../lib/sync/oauth')

ava('.getAuthorizeUrl() should generate a url without a state', (test) => {
	const url = oauth.getAuthorizeUrl('https://api.balena-cloud.com', [ 'foo' ], null, {
		appId: 'xxxxxxxxxx',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	const qs = [
		'response_type=code',
		'client_id=xxxxxxxxxx',
		'redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Fbalena',
		'scope=foo'
	]

	test.is(url, `https://api.balena-cloud.com/oauth/authorize?${qs.join('&')}`)
})

ava('.getAuthorizeUrl() should generate a url with a scalar state', (test) => {
	const url = oauth.getAuthorizeUrl('https://api.balena-cloud.com', [ 'foo' ], 1, {
		appId: 'xxxxxxxxxx',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	const qs = [
		'response_type=code',
		'client_id=xxxxxxxxxx',
		'redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Fbalena',
		'scope=foo',
		'state=1'
	]

	test.is(url, `https://api.balena-cloud.com/oauth/authorize?${qs.join('&')}`)
})

ava('.getAuthorizeUrl() should generate a url with one scope', (test) => {
	const url = oauth.getAuthorizeUrl('https://api.balena-cloud.com', [ 'foo' ], {
		hello: 'world'
	}, {
		appId: 'xxxxxxxxxx',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	const qs = [
		'response_type=code',
		'client_id=xxxxxxxxxx',
		'redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Fbalena',
		'scope=foo',
		'state=%7B%22hello%22%3A%22world%22%7D'
	]

	test.is(url, `https://api.balena-cloud.com/oauth/authorize?${qs.join('&')}`)
})

ava('.getAuthorizeUrl() should generate a url with multiple scopes', (test) => {
	const url = oauth.getAuthorizeUrl('https://api.balena-cloud.com', [
		'foo',
		'bar',
		'baz'
	], {
		hello: 'world'
	}, {
		appId: 'xxxxxxxxxx',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	const qs = [
		'response_type=code',
		'client_id=xxxxxxxxxx',
		'redirect_uri=https%3A%2F%2Fjel.ly.fish%2Foauth%2Fbalena',
		'scope=foo+bar+baz',
		'state=%7B%22hello%22%3A%22world%22%7D'
	]

	test.is(url, `https://api.balena-cloud.com/oauth/authorize?${qs.join('&')}`)
})

ava('.getAuthorizeUrl() should throw given no appId', (test) => {
	test.throws(() => {
		oauth.getAuthorizeUrl('https://api.balena-cloud.com', [
			'foo',
			'bar',
			'baz'
		], {
			hello: 'world'
		}, {
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		})
	}, oauth.OAuthInvalidOption)
})

ava('.getAuthorizeUrl() should throw given no redirectUri', (test) => {
	test.throws(() => {
		oauth.getAuthorizeUrl('https://api.balena-cloud.com', [
			'foo',
			'bar',
			'baz'
		], {
			hello: 'world'
		}, {
			appId: 'xxxxxxxxxx'
		})
	}, oauth.OAuthInvalidOption)
})

ava('.getAuthorizeUrl() should throw given no scopes', (test) => {
	test.throws(() => {
		oauth.getAuthorizeUrl('https://api.balena-cloud.com', [], {
			hello: 'world'
		}, {
			appId: 'xxxxxxxxxx',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		})
	}, oauth.OAuthInvalidOption)
})

ava('.getAuthorizeUrl() should throw given scopes is null', (test) => {
	test.throws(() => {
		oauth.getAuthorizeUrl('https://api.balena-cloud.com', null, {
			hello: 'world'
		}, {
			appId: 'xxxxxxxxxx',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		})
	}, oauth.OAuthInvalidOption)
})

ava('.getAccessToken() should return the access token if successful', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.balena-cloud.com')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'xxxxxxxxxxxx',
				client_secret: 'yyyyyyyy',
				redirect_uri: 'https://jel.ly.fish/oauth/balena',
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	const result = await oauth.getAccessToken('https://api.balena-cloud.com', '123456', {
		appId: 'xxxxxxxxxxxx',
		appSecret: 'yyyyyyyy',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	test.deepEqual(result, {
		access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
		token_type: 'bearer',
		expires_in: 3600,
		refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
		scope: 'create'
	})

	nock.cleanAll()
})

ava('.getAccessToken() should throw given the wrong code', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.balena-cloud.com')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'authorization_code',
				client_id: 'xxxxxxxxxxxx',
				client_secret: 'yyyyyyyy',
				redirect_uri: 'https://jel.ly.fish/oauth/balena',
				code: '123456'
			})) {
				return callback(null, [ 200, {
					access_token: 'MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3',
					token_type: 'bearer',
					expires_in: 3600,
					refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
					scope: 'create'
				} ])
			}

			return callback(null, [ 400, {
				error: 'invalid_request',
				error_description: 'Something went wrong'
			} ])
		})

	await test.throwsAsync(
		oauth.getAccessToken('https://api.balena-cloud.com', 'oooooo', {
			appId: 'xxxxxxxxxxxx',
			appSecret: 'yyyyyyyy',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthUnsuccessfulResponse)

	nock.cleanAll()
})

ava('.getAccessToken() should throw given no appId', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.getAccessToken('https://api.balena-cloud.com', '123456', {
			appSecret: 'yyyyyyyy',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})

ava('.getAccessToken() should throw given no appSecret', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.getAccessToken('https://api.balena-cloud.com', '123456', {
			appId: 'xxxxxxxxxx',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})

ava('.getAccessToken() should throw given no redirectUri', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.getAccessToken('https://api.balena-cloud.com', '123456', {
			appId: 'xxxxxxxxxx',
			appSecret: 'yyyyyyyy'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})

ava('.refreshAccessToken() should return the new access token if successful', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.balena-cloud.com')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'refresh_token',
				client_id: 'xxxxxxxxxxxx',
				client_secret: 'yyyyyyyy',
				redirect_uri: 'https://jel.ly.fish/oauth/balena',
				refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk'
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

	const result = await oauth.refreshAccessToken('https://api.balena-cloud.com', {
		grant_type: 'refresh_token',
		client_id: 'xxxxxxxxxxxx',
		client_secret: 'yyyyyyyy',
		redirect_uri: 'https://jel.ly.fish/oauth/balena',
		refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk'
	}, {
		appId: 'xxxxxxxxxxxx',
		appSecret: 'yyyyyyyy',
		redirectUri: 'https://jel.ly.fish/oauth/balena'
	})

	test.deepEqual(result, {
		access_token: 'KSTWMqidua67hjM2NDE1ZTZjNGZmZjI3',
		token_type: 'bearer',
		expires_in: 3600,
		refresh_token: 'POolsdYTlmM2YxOTQ5MGE3YmNmMDFkNTVk',
		scope: 'create'
	})

	nock.cleanAll()
})

ava('.refreshAccessToken() should fail if the access token is invalid', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await nock('https://api.balena-cloud.com')
		.post('/oauth/token')
		.reply(function (uri, request, callback) {
			const body = querystring.decode(request)

			if (_.isEqual(body, {
				grant_type: 'refresh_token',
				client_id: 'xxxxxxxxxxxx',
				client_secret: 'yyyyyyyy',
				redirect_uri: 'https://jel.ly.fish/oauth/balena',
				refresh_token: 'IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk'
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

	await test.throwsAsync(
		oauth.refreshAccessToken('https://api.balena-cloud.com', {
			grant_type: 'refresh_token',
			client_id: 'xxxxxxxxxxxx',
			client_secret: 'yyyyyyyy',
			redirect_uri: 'https://jel.ly.fish/oauth/balena',
			refresh_token: '0000000000000000000'
		}, {
			appId: 'xxxxxxxxxxxx',
			appSecret: 'yyyyyyyy',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthUnsuccessfulResponse)

	nock.cleanAll()
})

ava('.refreshAccessToken() should fail if no appId', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.refreshAccessToken('https://api.balena-cloud.com', {
			grant_type: 'refresh_token',
			client_id: 'xxxxxxxxxxxx',
			client_secret: 'yyyyyyyy',
			redirect_uri: 'https://jel.ly.fish/oauth/balena',
			refresh_token: '0000000000000000000'
		}, {
			appSecret: 'yyyyyyyy',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})

ava('.refreshAccessToken() should fail if no appSecret', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.refreshAccessToken('https://api.balena-cloud.com', {
			grant_type: 'refresh_token',
			client_id: 'xxxxxxxxxxxx',
			client_secret: 'yyyyyyyy',
			redirect_uri: 'https://jel.ly.fish/oauth/balena',
			refresh_token: '0000000000000000000'
		}, {
			appId: 'xxxxxxxxxx',
			redirectUri: 'https://jel.ly.fish/oauth/balena'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})

ava('.refreshAccessToken() should fail if no redirectUri', async (test) => {
	nock.cleanAll()
	nock.disableNetConnect()

	await test.throwsAsync(
		oauth.refreshAccessToken('https://api.balena-cloud.com', {
			grant_type: 'refresh_token',
			client_id: 'xxxxxxxxxxxx',
			client_secret: 'yyyyyyyy',
			redirect_uri: 'https://jel.ly.fish/oauth/balena',
			refresh_token: '0000000000000000000'
		}, {
			appId: 'xxxxxxxxxx',
			appSecret: 'yyyyyyyy'
		}),
		oauth.OAuthInvalidOption)

	nock.cleanAll()
})
