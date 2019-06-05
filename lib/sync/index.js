/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pipeline = require('./pipeline')
const INTEGRATIONS = require('./integrations')

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
 * @param {Object} card - action target card
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @param {String} options.integration - integration name
 * @param {Object} options.context - action context
 * @param {Any} options.token - token
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await sync.translate({ ... }, { ... })
 */
exports.mirror = async (card, options) => {
	if (!options.token) {
		options.context.log.warn('Ignoring mirror as there is no token', {
			integration: options.integration
		})

		return []
	}

	const integration = INTEGRATIONS[options.integration]
	if (!integration) {
		options.context.log.warn(
			'Ignoring mirror as there is no compatible integration', {
				integration: options.integration
			})

		return []
	}

	return pipeline.mirrorCard(integration, card, {
		actor: options.actor,
		token: options.token,
		context: options.context
	})
}

/**
 * @summary Translate an external event into Jellyfish
 * @function
 * @public
 *
 * @param {Object} card - action target card
 * @param {Object} options - options
 * @param {String} options.actor - actor id
 * @param {Object} options.context - action context
 * @param {String} options.timestamp - timestamp
 * @param {Any} options.token - token
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await sync.translate({ ... }, { ... })
 */
exports.translate = async (card, options) => {
	const source = card.data.source

	if (!options.token) {
		options.context.log.warn('Ignoring translate as there is no token', {
			integration: source
		})

		return []
	}

	const integration = INTEGRATIONS[source]
	if (!integration) {
		options.context.log.warn(
			'Ignoring mirror as there is no compatible integration', {
				integration: source
			})

		return []
	}

	options.context.log.info('Translating external event', {
		id: card.id,
		integration: source
	})

	const cards = await pipeline.translateExternalEvent(integration, card, {
		token: options.token,
		context: options.context
	})

	options.context.log.info('Translated external event', {
		slugs: cards.map((translatedCard) => {
			return translatedCard.slug
		})
	})

	return cards
}

exports.getFile = (file, options) => {
	const source = options.source

	if (!options.token) {
		options.logger.warn(options.context, 'Ignoring getFile as there is no token', {
			integration: source
		})

		return null
	}

	const Integration = INTEGRATIONS[source]
	if (!Integration) {
		options.logger.warn(options.context,
			'Ignoring mirror as there is no compatible integration', {
				integration: source
			})

		return null
	}

	options.logger.info(options.context, 'Retrieving external file', {
		file,
		integration: source
	})

	return new Integration(options).getFile(file)
}
