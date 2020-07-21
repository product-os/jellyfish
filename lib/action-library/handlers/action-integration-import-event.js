/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const sync = require('../../sync')
const environment = require('@balena/jellyfish-environment')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const syncContext = require('./sync-context')

const handler = async (session, context, card, request) => {
	const cards = await sync.translate(
		card.data.source,
		environment.integration[card.data.source],
		card,
		syncContext.fromWorkerContext(
			card.data.source, context, request.context, session),
		{
			actor: request.actor,
			defaultUser: environment.integration.default.user,
			origin: `${environment.oauth.redirectBaseUrl}/oauth/${card.data.source}`,
			timestamp: request.timestamp
		}).catch((error) => {
		console.log('subs 06', JSON.stringify(card, null, 4))
		logger.exception(request.context, 'Translate error', error)
		throw error
	})

	return cards.map((element) => {
		return {
			id: element.id,
			type: element.type,
			version: element.version,
			slug: element.slug
		}
	})
}

module.exports = {
	handler
}
