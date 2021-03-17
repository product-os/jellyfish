/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const assert = require('@balena/jellyfish-assert')
const typedErrors = require('typed-errors')
const requestLib = require('request')
const Mustache = require('mustache')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)

exports.errors = {
	OAuthUnsuccessfulResponse: typedErrors.makeTypedError('OAuthUnsuccessfulResponse'),
	OAuthRequestError: typedErrors.makeTypedError('OAuthRequestError'),
	OauthNoMatchingUser: typedErrors.makeTypedError('OauthNoMatchingUser')
}

/**
 * @summary Send a HTTP request
 * @function
 *
 * @description
 * Handles rate limit and throws if the status code is not 200
 *
 * @param {String} uri - Request Uri
 * @param {Object} options - Request options (passed to `request`)
 * @param {Number} [retries] - Number of retries
 * @returns {Object} HTTP response data
 */
const request = async (uri, options = {}, retries = 10) => {
	const {
		code: statusCode,
		body: data
	} = await new Bluebird(
		(resolve, reject) => {
			requestLib(
				{
					uri,
					json: true,
					...options
				},
				(error, response, body) => {
					if (error) {
						return reject(error)
					}

					return resolve({
						code: response.statusCode,
						body
					})
				}
			)
		}
	)

	// Take rate limiting into account
	if (statusCode === 429 && retries > 0) {
		await Bluebird.delay(5000)
		return request(uri, options, retries - 1)
	}

	assert.INTERNAL(null, statusCode < 500, exports.errors.OAuthRequestError,
		() => {
			return `POST ${uri} responded with ${statusCode}: ${(JSON.stringify(data, null, 2))}`
		})

	assert.INTERNAL(null, statusCode < 400, exports.errors.OAuthUnsuccessfulResponse,
		() => {
			return [
				`POST ${uri} responded with ${statusCode}:`,
				JSON.stringify(data, null, 2),
				`to request: ${JSON.stringify(options, null, 2)}`
			].join(' ')
		})

	assert.INTERNAL(null, statusCode === 200, exports.errors.OAuthRequestError,
		() => {
			return `POST ${uri} responded with ${statusCode}: ${(JSON.stringify(data, null, 2))}`
		})

	return data
}

/**
 * @summary Get JF user slug from username
 * @function
 *
 * @description
 * Constructs user slug with 'user-' prefix, oauth provider's slug and formatted username
 *
 * @param {Object} provider - Oauth provider
 * @param {String} username - External user's username
 * @returns {String} User's slug
 */
exports.slugifyUsername = (provider, username) => {
	const formatted = username
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')

	return `user-${provider.slug}-${formatted}`
}

/**
 * @summary Get oauth provider's authorization url
 * @function
 *
 * @description
 * Oauth provider's authorizeUrl property is a template which gets rendered with
 * oauth client data
 *
 * @param {Object} client - Oauth client
 * @param {Object} provider - Oauth provider
 * @returns {String} User's slug
 */
exports.getAuthorizeUrl = (client, provider) => {
	const data = {
		...client.data
	}

	if (data.redirectUrl) {
		data.redirectUrl = encodeURIComponent(data.redirectUrl)
	}

	const redirectUrl = new URL(Mustache.render(provider.data.authorizeUrl, data))
	return redirectUrl.href
}

/**
 * @summary Get oauth provider card by attached oauth client
 * @function
 *
 * @param {Object} context - Request context
 * @param {Object} worker - Worker instance
 * @param {String} session - Session token
 * @param {String} clientSlug - Slug of the oauth client
 * @returns {Object} Oauth provider card
 */
exports.getOauthProviderCardByClient = async (context, worker, session, clientSlug) => {
	return (await worker.jellyfish.query(
		context, session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			properties: {
				type: {
					const: 'oauth-provider@1.0.0'
				}
			},
			$$links: {
				'has attached': {
					type: 'object',
					required: [ 'slug' ],
					additionalProperties: true,
					properties: {
						slug: {
							const: clientSlug
						}
					}
				}
			}
		}))[0]
}

/**
 * @summary Fetch external user data
 * @function
 *
 * @description
 * Send request to `provider.data.whoamiUrl` with credentials to get external user information
 *
 * @param {Object} context - Request context
 * @param {Object} provider - Oauth provider
 * @param {Object} credentials - external api credentials
 * @returns {Object} User data formatted with mapping `provider.data.whoamiFieldMap`
 */
exports.whoami = async (context, provider, credentials) => {
	if (!provider.data.whoamiUrl) {
		logger.info(context, 'OAuth: No whoami endpoint exists for the provider, skipping call', {
			provider: provider.slug
		})

		return null
	}

	const data = await request(provider.data.whoamiUrl, {
		headers: {
			Authorization: `${credentials.token_type} ${credentials.access_token}`
		}
	})

	if (!data) {
		throw new Error(`${provider.slug}'s endpoint ${provider.data.whoamiUrl} returned no data.`)
	}

	logger.info(context, 'OAuth: Received whoami data, transforming...', {
		provider: provider.slug,
		data
	})

	return Object.keys(provider.data.whoamiFieldMap).reduce((map, key) => {
		map[key] = provider.data.whoamiFieldMap[key].length
			? _.get(data, provider.data.whoamiFieldMap[key])
			: data

		return map
	}, {})
}

/**
 * @summary Get JF user matching external user
 * @function
 *
 * @param {Object} context - Request context
 * @param {Object} worker - Worker instance
 * @param {String} session - Session token
 * @param {Object} provider - Oauth provider
 * @param {Object} externalUser - External user
 * @param {Object} options - Options
 * @returns {Object} User card
 */
exports.match = async (context, worker, session, provider, externalUser, options) => {
	const userSlug = externalUser
		? exports.slugifyUsername(provider, externalUser.username)
		: options.userSlug

	assert.USER(null, userSlug === options.userSlug, exports.errors.OauthNoMatchingUser,
		() => {
			return `Different user (${userSlug} !== ${options.userSlug}) is authorized on provider "${provider.slug}"`
		})

	logger.info(context, 'OAuth: Getting matching user', {
		userSlug,
		provider: provider.slug
	})

	const user = await worker.jellyfish.getCardBySlug(
		context,
		session,
		`${userSlug}@1.0.0`
	)

	assert.INTERNAL(null, externalUser || user, exports.errors.OauthNoMatchingUser,
		() => {
			return `Could not find matching user by slug "${options.userSlug}"`
		})

	return user
}

/**
 * @summary Exchange oauth code to external api token
 * @function
 *
 * @param {Object} context - Request context
 * @param {Object} provider - Oauth provider
 * @param {Object} client - Oauth client
 * @param {Object} code - Oauth code
 * @returns {Object} External api credentials
 */
exports.authorize = async (context, provider, client, code) => {
	logger.info(context, 'OAuth: Exchange code for external token', {
		provider: provider.slug,
		client: client.slug,
		clientId: client.data.clientId,
		redirectUrl: client.data.redirectUrl
	})

	return request(provider.data.tokenUrl, {
		method: 'POST',
		form: {
			client_id: client.data.clientId,
			client_secret: client.data.clientSecret,
			grant_type: 'authorization_code',
			redirect_uri: client.data.redirectUrl,
			code
		}
	})
}
