/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../logger').getLogger(__filename)
const sync = require('../sync')
const environment = require('../environment')
const syncContext = require('./handlers/sync-context')
const metrics = require('../metrics')

const mirror = async (type, session, context, card, request) => {
	// Don't sync back changes that came externally
	if (request.originator) {
		const originator = await context.getCardById(
			context.privilegedSession, request.originator)
		if (originator &&
			originator.type &&
			originator.type.split('@')[0] === 'external-event' &&

			// Only break the chain if we are trying to mirror
			// an external event that came from that same service
			originator.data.source === type) {
			logger.info(request.context, 'Not mirroring external event', {
				type,
				request
			})

			return []
		}
	}

	const cards = await metrics.measureMirror(type, async () => {
		return sync.mirror(
			type,
			environment.integration[type],
			card,
			syncContext.fromWorkerContext(type, context, request.context, context.privilegedSession),
			{
				actor: request.actor,
				defaultUser: environment.integration.default.user,
				origin: `${environment.oauth.redirectBaseUrl}/oauth/${type}`
			}
		)
	}).catch((error) => {
		logger.exception(request.context, 'Mirror error', error)
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

module.exports = mirror
