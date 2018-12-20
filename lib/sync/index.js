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
const logger = require('../logger').getLogger(__filename)
const ctx = require('../logger/context')

const getActor = async (localUser, session, context, request) => {
	if (localUser.type === 'user') {
		const userCard = await context.getCardBySlug(context.privilegedSession, `${localUser.type}-${localUser.username}`, {
			type: localUser.type
		})

		if (userCard) {
			return userCard.id
		}

		return request.actor
	}

	if (localUser.type === 'account') {
		const slug = `${localUser.type}-${localUser.email.replace(/[@|.]/g, '-')}`
		const account = await context.getCardBySlug(context.privilegedSession, slug, {
			type: localUser.type
		})

		if (account) {
			return account.id
		}

		const typeCard = await context.getCardBySlug(session, localUser.type, {
			type: 'type'
		})

		if (!typeCard) {
			throw new context.errors.WorkerNoElement(`No such type: ${localUser.type}`)
		}

		const result = await context.insertCard(context.privilegedSession, typeCard, {
			timestamp: request.timestamp,
			actor: request.actor,
			attachEvents: true,
			override: false
		}, {
			slug,
			version: '1.0.0',
			data: {
				email: localUser.email
			}
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
 * @param {String} session - session
 * @param {Object} context - action context
 * @param {Object} card - action target card
 * @param {Object} request - action request
 * @returns {Object[]} inserted cards
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const cards = await sync.translate('github', session, { ... }, {
 *   type: 'external-event',
 *   ...
 * }, { ... })
 */
exports.mirror = async (name, session, context, card, request) => {
	const token = exports.getToken(name)
	if (!token) {
		logger.warn(ctx, 'Ignoring mirror as there is no token', {
			integration: name
		})

		return []
	}

	const integration = INTEGRATIONS[name]
	if (!integration) {
		logger.warn(ctx, 'Ignoring mirror as there is no compatible integration', {
			integration: name
		})

		return []
	}

	return pipeline.mirrorCard(integration, card, {
		actor: request.actor,
		token,
		context,
		session
	})
}

/**
 * @summary Translate an external event into Jellyfish
 * @function
 * @public
 *
 * @param {String} session - session
 * @param {Object} context - action context
 * @param {Object} card - action target card
 * @param {Object} request - action request
 * @returns {Object[]} inserted cards
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const cards = await sync.translate(session, { ... }, {
 *   type: 'external-event',
 *   ...
 * }, { ... })
 */
exports.translate = async (session, context, card, request) => {
	const source = card.data.source
	const token = exports.getToken(source)
	if (!token) {
		logger.warn(ctx, 'Ignoring translate as there is no token', {
			integration: source
		})

		return []
	}

	const integration = INTEGRATIONS[source]
	if (!integration) {
		logger.warn(ctx, 'Ignoring mirror as there is no compatible integration', {
			integration: source
		})

		return []
	}

	const localUser = integration.getLocalUser(card)
	const actor = await getActor(localUser, session, context, request)
	return pipeline.translateExternalEvent(integration, card, {
		actor,
		token,
		context,
		session
	})
}
