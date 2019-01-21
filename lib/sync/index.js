/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const pipeline = require('./pipeline')
const INTEGRATIONS = require('./integrations')

/**
 * @summary Check if an external event request is valid
 * @function
 * @public
 *
 * @param {Object} token - token details
 * @param {String} provider - sync provider
 * @param {String} rawEvent - raw event payload
 * @param {Object} headers - request headers
 * @returns {Boolean} whether the external event should be accepted or not
 *
 * @example
 * if (sync.isValidExternalEventRequest({ ... }, 'github', '...', {
 *   'X-hub-signature': '...'
 * })) {
 *   console.log('Accept event')
 * }
 */
exports.isValidExternalEventRequest = (token, provider, rawEvent, headers) => {
	const integration = INTEGRATIONS[provider]
	if (!integration || !token) {
		return false
	}

	return integration.isEventValid(token, rawEvent, headers)
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

	return pipeline.translateExternalEvent(integration, card, {
		token: options.token,
		context: options.context
	})
}
