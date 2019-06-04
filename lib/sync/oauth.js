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

exports.OAuthRequestError =
	typedErrors.makeTypedError('OAuthRequestError')
exports.OAuthInvalidOption =
	typedErrors.makeTypedError('OAuthInvalidOption')
exports.OAuthUnsuccessfulResponse =
	typedErrors.makeTypedError('OAuthUnsuccessfulResponse')

const assert = (errorObject, condition, message) => {
	if (condition) {
		return true
	}

	// eslint-disable-next-line new-cap
	throw new errorObject(message)
}

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
 * @returns {Object} HTTP response (code, body)
 */
exports.request = async (accessToken, options) => {
	return new Bluebird((resolve, reject) => {
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
	assert(exports.OAuthInvalidOption, Boolean(options.appId),
		'Missing appId')
	assert(exports.OAuthInvalidOption, Boolean(options.redirectUri),
		'Missing redirectUri')
	assert(exports.OAuthInvalidOption, scopes && scopes.length,
		'Missing or invalid scopes')

	const authorizeUrl = new url.URL('/oauth/authorize', baseUrl)
	authorizeUrl.searchParams.append('response_type', 'code')
	authorizeUrl.searchParams.append('client_id', options.appId)
	authorizeUrl.searchParams.append('redirect_uri', options.redirectUri)
	authorizeUrl.searchParams.append('scope', scopes.join(' '))

	if (state) {
		authorizeUrl.searchParams.append('state', JSON.stringify(state))
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

	// OAuth errors must contain this code according to
	// https://www.oauth.com/oauth2-servers/access-tokens/access-token-response/
	if (code === 400) {
		const oauthError = new exports.OAuthUnsuccessfulResponse(
			`POST ${path} responded with ${body.error_description}`)
		oauthError.type = body.error
		throw oauthError
	}

	if (code !== 200) {
		const description = JSON.stringify(body, null, 2)
		throw new exports.OAuthRequestError(
			`POST ${path} responded with ${code}: ${description}`)
	}

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
	assert(exports.OAuthInvalidOption, Boolean(options.appId),
		'Missing appId')
	assert(exports.OAuthInvalidOption, Boolean(options.appSecret),
		'Missing appSecret')
	assert(exports.OAuthInvalidOption, Boolean(options.redirectUri),
		'Missing redirectUri')
	assert(exports.OAuthInvalidOption, Boolean(code),
		'Missing code')

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
	assert(exports.OAuthInvalidOption, Boolean(options.appId),
		'Missing appId')
	assert(exports.OAuthInvalidOption, Boolean(options.appSecret),
		'Missing appSecret')
	assert(exports.OAuthInvalidOption, Boolean(options.redirectUri),
		'Missing redirectUri')
	assert(exports.OAuthInvalidOption, accessToken && accessToken.refresh_token,
		'Missing refresh token')

	return oauthPost(baseUrl, '/oauth/token', {
		grant_type: 'refresh_token',
		client_id: options.appId,
		client_secret: options.appSecret,
		redirect_uri: options.redirectUri,
		refresh_token: accessToken.refresh_token
	})
}
