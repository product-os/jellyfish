/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const errio = require('errio')
const logger = require('../../../lib/logger').getLogger(__filename)
const sync = require('../../../lib/sync')
const environment = require('../../../lib/environment')

exports.getRedirectUrl = (provider) => {
	return `${environment.oauth.redirectBaseUrl}/oauth/${provider}`
}

exports.getAuthorizeUrl = (provider, userSlug) => {
	return sync.getAssociateUrl(
		provider,
		environment.integration[provider],
		userSlug, {
			origin: exports.getRedirectUrl(provider)
		})
}

exports.associate = async (context, jellyfish, worker, queue, session, provider, options) => {
	logger.info(context, 'OAuth authorization', {
		ip: options.ip,
		provider,
		code: options.code,
		state: options.actor
	})

	if (!options.actor) {
		return null
	}

	const actorCard = await jellyfish.getCardBySlug(
		context, session, options.actor)
	if (!actorCard) {
		return null
	}

	const data = await worker.pre(session, {
		action: 'action-oauth-associate',
		context,
		card: options.actor,
		type: 'user',
		arguments: {
			provider,
			code: options.code,
			origin: exports.getRedirectUrl(provider)
		}
	})

	const actionRequest = await queue.enqueue(
		worker.getId(), session, data)
	const results = await queue.waitResults(
		context, actionRequest)

	if (results.error) {
		const errorObject = errio.fromObject(results.data)
		if (!results.data.expected) {
			logger.exception(context, 'OAuth error', errorObject)
		}

		throw errorObject
	}

	return results.data
}
