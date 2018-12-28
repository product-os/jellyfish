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

const getActor = async (localUser, context, request) => {
	if (localUser.type === 'user') {
		const userCard = await context.getElementBySlug(
			localUser.type, `${localUser.type}-${localUser.username}`)
		if (userCard) {
			return userCard.id
		}

		return request.actor
	}

	if (localUser.type === 'account') {
		const slug = `${localUser.type}-${localUser.email.replace(/[@|.]/g, '-')}`
		const account = await context.getElementBySlug(localUser.type, slug)
		if (account) {
			return account.id
		}

		const result = await context.insertElement(localUser.type, {
			slug,
			version: '1.0.0',
			data: {
				email: localUser.email
			}
		}, {
			timestamp: request.timestamp,
			actor: request.actor
		})

		return result.id
	}

	return request.actor
}

/**
 * @summary Check if an external event request is valid
 * @function
 * @public
 *
 * @param {String} host - originator host name
 * @param {String} provider - sync provider
 * @returns {Boolean} whether the external event should be accepted or not
 *
 * @example
 * if (sync.isValidExternalEventRequest('github.com', 'github')) {
 *   console.log('Accept event')
 * }
 */
exports.isValidExternalEventRequest = (host, provider) => {
	// For development purposes
	if (process.env.NODE_ENV !== 'production' &&
		(/^localhost(:\d+)?$/.test(host) || /ngrok\.io$/.test(host))) {
		return true
	}

	const integration = INTEGRATIONS[provider]
	if (!integration) {
		return false
	}

	if (!integration.hosts || integration.hosts.length === 0) {
		return true
	}

	for (const regex of integration.hosts) {
		if (regex.test(host)) {
			return true
		}
	}

	return false
}

/**
 * @summary Get an integration token
 * @function
 * @public
 *
 * @param {String} integration - integration name
 * @returns {(Any|Null)} token
 *
 * @example
 * const token = sync.getToken('github')
 * console.log(token)
 */
exports.getToken = (integration) => {
	if (integration === 'github') {
		return process.env.INTEGRATION_GITHUB_TOKEN
	}

	if (integration === 'front') {
		return process.env.INTEGRATION_FRONT_TOKEN
	}

	return null
}

/**
 * @summary Mirror back a card insert coming from Jellyfish
 * @function
 * @public
 *
 * @param {String} name - integration name
 * @param {Object} context - action context
 * @param {Object} card - action target card
 * @param {Object} request - action request
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await sync.translate('github', { ... }, {
 *   type: 'external-event',
 *   ...
 * }, { ... })
 */
exports.mirror = async (name, context, card, request) => {
	const token = exports.getToken(name)
	if (!token) {
		context.log.warn('Ignoring mirror as there is no token', {
			integration: name
		})

		return []
	}

	const integration = INTEGRATIONS[name]
	if (!integration) {
		context.log.warn('Ignoring mirror as there is no compatible integration', {
			integration: name
		})

		return []
	}

	return pipeline.mirrorCard(integration, card, {
		actor: request.actor,
		token,
		context
	})
}

/**
 * @summary Translate an external event into Jellyfish
 * @function
 * @public
 *
 * @param {Object} context - action context
 * @param {Object} card - action target card
 * @param {Object} request - action request
 * @returns {Object[]} inserted cards
 *
 * @example
 * const cards = await sync.translate({ ... }, {
 *   type: 'external-event',
 *   ...
 * }, { ... })
 */
exports.translate = async (context, card, request) => {
	const source = card.data.source
	const token = exports.getToken(source)
	if (!token) {
		context.log.warn('Ignoring translate as there is no token', {
			integration: source
		})

		return []
	}

	const integration = INTEGRATIONS[source]
	if (!integration) {
		context.log.warn('Ignoring mirror as there is no compatible integration', {
			integration: source
		})

		return []
	}

	const localUser = await integration.getLocalUser(card, {
		token
	})

	const actor = await getActor(localUser, context, request)
	return pipeline.translateExternalEvent(integration, card, {
		actor,
		token,
		context
	})
}
