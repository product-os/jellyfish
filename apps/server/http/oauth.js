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

exports.authorize = async (context, worker, queue, session, provider, options) => {
	logger.info(context, 'OAuth authorization', {
		ip: options.ip,
		provider,
		code: options.code
	})

	const sessionCard = await worker.jellyfish.getCardById(
		context, session, session)

	const data = await worker.pre(session, {
		action: 'action-oauth-authorize',
		context,
		card: sessionCard.data.actor,
		type: 'user@1.0.0',
		arguments: {
			provider,
			code: options.code,
			origin: exports.getRedirectUrl(provider),
			slug: options.slug
		}
	})

	const actionRequest = await queue.enqueue(
		worker.getId(), session, data)

	const results = await queue.waitResults(
		context, actionRequest)

	if (results.error) {
		throw errio.fromObject(results.data)
	}

	return results.data
}

exports.associate = async (context, worker, queue, session, provider, user, credentials, options) => {
	logger.info(context, 'OAuth association', {
		ip: options.ip,
		provider,
		user: user.id
	})

	const data = await worker.pre(session, {
		action: 'action-oauth-associate',
		context,
		card: user.id,
		type: 'user',
		arguments: {
			provider,
			credentials
		}
	})

	const actionRequest = await queue.enqueue(
		worker.getId(), session, data)

	const results = await queue.waitResults(
		context, actionRequest)

	if (results.error) {
		throw errio.fromObject(results.data)
	}

	return results.data
}
