/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const request = require('request')
const typedErrors = require('typed-errors')
const url = require('url')
const errors = require('./errors')
const assert = require('../assert')

exports.OAuthRequestError =
	typedErrors.makeTypedError('OAuthRequestError')
exports.OAuthInvalidOption =
	typedErrors.makeTypedError('OAuthInvalidOption')
exports.OAuthUnsuccessfulResponse =
	typedErrors.makeTypedError('OAuthUnsuccessfulResponse')

/**
 * @summary Send an HTTP request
 * @function
 * @public
 *
 * @description
 * If the access token is passed, then we set the
 * "Authorization" header out of the box, and then
 * delegate to the `request` module.
 *
 * @param {(Object|Undefined)} accessToken - Access token
 * @param {Object} options - Request options (passed to `request`)
 * @param {Number} [retries] - Number of retries
 * @returns {Object} HTTP response (code, body)
 */
exports.request = async (accessToken, options, retries = 10) => {
	const result = await new Bluebird((resolve, reject) => {
		// Use access token if available
		if (accessToken) {
			_.set(options, [
				'headers',
				'Authorization'
			], `Bearer ${accessToken.access_token}`)
		}

		request(options, (error, response, body) => {
			if (error) {
				return reject(error)
			}

			return resolve({
				code: response.statusCode,
				body
			})
		})
	})

	// Automatically retry on server failures
	if (result.code >= 500) {
		assert.USER(null, retries > 0,
			errors.SyncExternalRequestError,
			`External service responded with ${result.code} to OAuth request`)

		await Bluebird.delay(2000)
		return exports.request(accessToken, options, retries - 1)
	}

	return result
}

/**
 * @summary Get external authorize URL
 * @function
 * @public
 *
 * @description
 * This is the external OAuth URL that we must redirect
 * people to in order to confirm the authorization. When
 * that happens, the external service will direct the user
 * back to us along with a short lived code that we can
 * exchange for a proper access token.
 *
 * @param {String} baseUrl - OAuth service base URL
 * @param {String[]} scopes - List of desired scopes
 * @param {Any} state - Optional metadata to return after the redirect
 * @param {Object} options - options
 * @param {String} options.appId - The client id
 * @param {String} options.redirectUri - The redirect URL
 * @returns {String} Authorize URL
 */
exports.getAuthorizeUrl = (baseUrl, scopes, state, options) => {
	assert.INTERNAL(null, Boolean(options.appId),
		exports.OAuthInvalidOption, 'Missing appId')
	assert.INTERNAL(null, Boolean(options.redirectUri),
		exports.OAuthInvalidOption, 'Missing redirectUri')
	assert.INTERNAL(null, scopes && scopes.length,
		exports.OAuthInvalidOption, 'Missing or invalid scopes')

	const authorizeUrl = new url.URL('/oauth/authorize', baseUrl)
	authorizeUrl.searchParams.append('response_type', 'code')
	authorizeUrl.searchParams.append('client_id', options.appId)
	authorizeUrl.searchParams.append('redirect_uri', options.redirectUri)
	authorizeUrl.searchParams.append('scope', scopes.join(' '))

	if (state) {
		const string = _.isString(state)
			? state
			: JSON.stringify(state)
		authorizeUrl.searchParams.append('state', string)
	}

	return authorizeUrl.href
}

const oauthPost = async (baseUrl, path, data) => {
	const {
		code,
		body
	} = await exports.request(null, {
		baseUrl,
		uri: path,
		json: true,
		method: 'POST',
		form: data
	})

	assert.INTERNAL(null, code < 500, exports.OAuthRequestError,
		() => {
			return `POST ${baseUrl}${path} responded with ${code}: ${(JSON.stringify(body, null, 2))}`
		})

	assert.INTERNAL(null, code < 400, exports.OAuthUnsuccessfulResponse,
		() => {
			return [
				`POST ${baseUrl}${path} responded with ${code}:`,
				JSON.stringify(body, null, 2),
				`to payload: ${JSON.stringify(data, null, 2)}`
			].join(' ')
		})

	assert.INTERNAL(null, code === 200, exports.OAuthRequestError,
		() => {
			return `POST ${baseUrl}${path} responded with ${code}: ${(JSON.stringify(body, null, 2))}`
		})

	return body
}

/**
 * @summary Swap a short lived token for an access token
 * @function
 * @public
 *
 * @description
 * This function takes a short lived token an exchanges it
 * for a proper access token that looks like this:
 *
 * {
 *   "access_token": "MTQ0NjJkZmQ5OTM2NDE1ZTZjNGZmZjI3",
 *   "token_type": "bearer",
 *   "expires_in": 3600,
 *   "refresh_token": "IwOGYzYTlmM2YxOTQ5MGE3YmNmMDFkNTVk",
 *   "scope": "create"
 * }
 *
 * @param {String} baseUrl - OAuth service base URL
 * @param {String} code - Short-lived token
 * @param {Object} options - options
 * @param {String} options.appId - The client id
 * @param {String} options.appSecret - The client secret
 * @param {String} options.redirectUri - The redirect URL
 * @returns {Object} Access token
 */
exports.getAccessToken = async (baseUrl, code, options) => {
	assert.INTERNAL(null, Boolean(options.appId),
		exports.OAuthInvalidOption, 'Missing appId')
	assert.INTERNAL(null, Boolean(options.appSecret),
		exports.OAuthInvalidOption, 'Missing appSecret')
	assert.INTERNAL(null, Boolean(options.redirectUri),
		exports.OAuthInvalidOption, 'Missing redirectUri')
	assert.INTERNAL(null, Boolean(code),
		exports.OAuthInvalidOption, 'Missing code')

	return oauthPost(baseUrl, '/oauth/token', {
		grant_type: 'authorization_code',
		client_id: options.appId,
		client_secret: options.appSecret,
		redirect_uri: options.redirectUri,
		code
	})
}

/**
 * @summary Refresh an expired access token
 * @public
 * @function
 *
 * @description The `accessToken` argument should be previously
 * adquired through `.getAccessToken()`. The result of this
 * function is the same as `.getAccessToken()`.
 *
 * @param {String} baseUrl - OAuth service base URL
 * @param {Object} accessToken - Access token
 * @param {Object} options - options
 * @param {String} options.appId - The client id
 * @param {String} options.appSecret - The client secret
 * @param {String} options.redirectUri - The redirect URL
 * @returns {Object} New access token
 */
exports.refreshAccessToken = async (baseUrl, accessToken, options) => {
	assert.INTERNAL(null, Boolean(options.appId),
		exports.OAuthInvalidOption, 'Missing appId')
	assert.INTERNAL(null, Boolean(options.appSecret),
		exports.OAuthInvalidOption, 'Missing appSecret')
	assert.INTERNAL(null, Boolean(options.redirectUri),
		exports.OAuthInvalidOption, 'Missing redirectUri')
	assert.INTERNAL(null, accessToken && accessToken.refresh_token,
		exports.OAuthInvalidOption, 'Missing refresh token')

	return oauthPost(baseUrl, '/oauth/token', {
		grant_type: 'refresh_token',
		client_id: options.appId,
		client_secret: options.appSecret,
		redirect_uri: options.redirectUri,
		refresh_token: accessToken.refresh_token
	})
}
