/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pipeline = require('./pipeline')
const _ = require('lodash')
const assert = require('../assert')
const INTEGRATIONS = require('./integrations')
const instance = require('./instance')
const oauth = require('./oauth')
const errors = require('./errors')

/**
 * @summary OAuth capable integrations
 * @public
 * @type {String[]}
 */
exports.OAUTH_INTEGRATIONS = _.reduce(INTEGRATIONS, (accumulator, value, key) => {
	if (value.OAUTH_BASE_URL && value.OAUTH_SCOPES) {
		accumulator.push(key)
	}

	return accumulator
}, [])

/**
 * @summary Get an external authorize URL
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {String} slug - user slug
 * @param {Object} options - options
 * @param {String} options.origin - The callback URL
 * @returns {String} Authorize URL
 */
exports.getAssociateUrl = (integration, token, slug, options) => {
	const Integration = INTEGRATIONS[integration]
	if (!Integration || !token || !token.appId) {
		return null
	}

	return oauth.getAuthorizeUrl(
		Integration.OAUTH_BASE_URL, Integration.OAUTH_SCOPES, slug, {
			appId: token.appId,
			redirectUri: options.origin
		})
}

/**
 * @summary Authorize a user with an external OAuth service
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.code - short lived OAuth code
 * @param {String} options.origin - The callbac URL
 * @returns {Object} external provider's access token
 */
exports.authorize = async (integration, token, context, options) => {
	const Integration = context.OAUTH_INTEGRATIONS ? context.OAUTH_INTEGRATIONS[integration] : INTEGRATIONS[integration]

	assert.INTERNAL(context, Integration,
		errors.SyncNoCompatibleIntegration,
		`There is no compatible integration for provider: ${integration}`)

	assert.INTERNAL(context, token && token.appId && token.appSecret,
		errors.SyncNoIntegrationAppCredentials,
		`No application credentials found for integration: ${integration}`)

	return oauth.getAccessToken(
		Integration.OAUTH_BASE_URL, options.code, {
			appId: token.appId,
			appSecret: token.appSecret,
			redirectUri: options.origin
		})
}

/**
 * @summary Gets local user matching provider's user
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.credentials - access token for external provider api
 * @param {String} options.slug - user slug used as fallback
 * @returns {Object} matching user
 */
exports.whoami = async (integration, context, options) => {
	const Integration = context.OAUTH_INTEGRATIONS ? context.OAUTH_INTEGRATIONS[integration] : INTEGRATIONS[integration]

	assert.INTERNAL(context, Integration,
		errors.SyncNoCompatibleIntegration,
		`There is no compatible integration for provider: ${integration}`)

	const {
		slug
	} = await Integration.whoami(
		options.credentials,
		context,
		{
			errors,
			slug: options.slug
		})

	const userCard = await context.getElementBySlug(slug)

	assert.INTERNAL(context, userCard,
		errors.SyncNoMatchingUser,
		`Could not find matching user for provider: ${integration}`)

	assert.INTERNAL(context, userCard.slug === options.slug,
		errors.SyncNoMatchingUser,
		`Could not find matching user for provider: ${integration}, slugs do not match ${userCard.slug} !== ${options.slug}`)

	return userCard
}

/**
 * @summary Associate a user with an external OAuth service
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} userCard - user to associate external token to
 * @param {Object} credentials - external provider's api token
 * @param {Object} context - execution context
 * @returns {Object} Upserted user card
 */
exports.associate = async (integration, userCard, credentials, context) => {
	const Integration = context.OAUTH_INTEGRATIONS ? context.OAUTH_INTEGRATIONS[integration] : INTEGRATIONS[integration]

	assert.INTERNAL(context, Integration,
		errors.SyncNoCompatibleIntegration,
		`There is no compatible integration: ${integration}`)

	/*
	 * Set the access token in the user card.
	 */
	_.set(userCard, [ 'data', 'oauth', integration ], credentials)
	return context.upsertElement(
		userCard.type, _.omit(userCard, [ 'type' ]), {
			timestamp: new Date()
		})
}

/**
 * @summary Check if an external event request is valid
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {Object} event - event
 * @param {String} event.raw - raw event payload
 * @param {Object} event.headers - request headers
 * @returns {Boolean} whether the external event should be accepted or not
 */
exports.isValidEvent = async (integration, token, event) => {
	const Integration = INTEGRATIONS[integration]
	if (!Integration || !token) {
		return false
	}

	return Integration.isEventValid(token, event.raw, event.headers)
}

/**
 * @summary Mirror back a card insert coming from Jellyfish
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {Object} card - action target card
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @param {String} [options.origin] - OAuth origin URL
 * @returns {Object[]} inserted cards
 */
exports.mirror = async (integration, token, card, context, options) => {
	if (!token) {
		context.log.warn('Ignoring mirror as there is no token', {
			integration
		})

		return []
	}

	const Integration = INTEGRATIONS[integration]
	if (!Integration) {
		context.log.warn(
			'Ignoring mirror as there is no compatible integration', {
				integration
			})

		return []
	}

	return pipeline.mirrorCard(Integration, card, {
		actor: options.actor,
		origin: options.origin,
		defaultUser: options.defaultUser,
		provider: integration,
		token,
		context
	})
}

/**
 * @summary Translate an external event into Jellyfish
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {Object} card - action target card
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @param {String} options.timestamp - timestamp
 * @param {String} [options.origin] - OAuth origin URL
 * @returns {Object[]} inserted cards
 */
exports.translate = async (integration, token, card, context, options) => {
	if (!token) {
		context.log.warn('Ignoring translate as there is no token', {
			integration
		})

		return []
	}

	const Integration = INTEGRATIONS[integration]
	if (!Integration) {
		context.log.warn(
			'Ignoring mirror as there is no compatible integration', {
				integration
			})

		return []
	}

	context.log.info('Translating external event', {
		id: card.id,
		slug: card.slug,
		integration
	})

	const cards = await pipeline.translateExternalEvent(
		Integration, card, {
			actor: options.actor,
			origin: options.origin,
			defaultUser: options.defaultUser,
			provider: integration,
			token,
			context
		})

	context.log.info('Translated external event', {
		slugs: cards.map((translatedCard) => {
			return translatedCard.slug
		})
	})

	return cards
}

/**
 * @summary Fetch a file synced in an external service
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {String} file - file id
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @returns {Buffer} file
 */
exports.getFile = (integration, token, file, context, options) => {
	if (!token) {
		context.log.warn('Don\'t fetching file as there is no token', {
			integration
		})

		return null
	}

	const Integration = INTEGRATIONS[integration]
	if (!Integration) {
		context.log.warn(
			'Ignoring mirror as there is no compatible integration', {
				integration
			})

		return null
	}

	context.log.info('Retrieving external file', {
		file,
		integration
	})

	return instance.run(Integration, token, async (integrationInstance) => {
		return integrationInstance.getFile(file)
	}, {
		actor: options.actor,
		provider: integration,
		context
	})
}
