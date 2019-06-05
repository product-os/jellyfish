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
 * @param {String} integration - integration name
 * @param {Object} token - token details
 * @param {Object} card - action target card
 * @param {Object} context - execution context
 * @param {Object} options - options
 * @param {String} options.actor - actor id
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
		integration
	})

	const cards = await pipeline.translateExternalEvent(
		Integration, card, {
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
