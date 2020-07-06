/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const errio = require('errio')
const {
	v4: uuid
} = require('uuid')
const logger = require('../../../lib/logger').getLogger(__filename)
const sync = require('../../../lib/sync')
const environment = require('@balena/jellyfish-environment')

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

exports.whoami = (context, worker, session, provider, credentials) => {
	return sync.whoami(
		{
			getElementBySlug: (slug) => {
				return worker.jellyfish.getCardBySlug(
					context, session, slug)
			}
		},
		provider,
		credentials
	)
}

exports.match = (context, worker, session, provider, externalUser, options) => {
	return sync.match(
		{
			getElementBySlug: (slug) => {
				return worker.jellyfish.getCardBySlug(
					context, session, slug)
			}
		},
		provider,
		externalUser,
		options
	)
}

exports.sync = async (context, worker, queue, session, provider, externalUser) => {
	const event = await worker.jellyfish.insertCard(context, session, {
		type: 'external-event@1.0.0',
		slug: `external-event-${uuid()}`,
		version: '1.0.0',
		data: await sync.getExternalUserSyncEventData(
			{},
			provider,
			externalUser
		)
	})

	const data = await worker.pre(session, {
		action: 'action-integration-import-event@1.0.0',
		context,
		card: event.id,
		type: event.type,
		arguments: {}
	})

	const actionRequest = await queue.enqueue(
		worker.getId(), session, data)

	const results = await queue.waitResults(
		context, actionRequest)

	if (results.error) {
		throw errio.fromObject(results.data)
	}
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
		action: 'action-oauth-authorize@1.0.0',
		context,
		card: sessionCard.data.actor,
		type: 'user@1.0.0',
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
		action: 'action-oauth-associate@1.0.0',
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
