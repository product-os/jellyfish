/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const logger = require('../../../../lib/logger').getLogger(__filename)

module.exports = class QueryFacade {
	constructor (jellyfish) {
		this.jellyfish = jellyfish
	}

	async queryAPI (context, sessionToken, query, options, ipAddress) {
		return Bluebird.try(async () => {
			if (!_.isString(query)) {
				return query
			}

			// Now try and load the view by slug
			const viewCardFromSlug = await this.jellyfish.getCardBySlug(
				context, sessionToken, `${query}@latest`)

			if (viewCardFromSlug && viewCardFromSlug.type.split('@')[0] === 'view') {
				return viewCardFromSlug
			}

			try {
				// Try and load the view by id first
				const viewCardFromId = await this.jellyfish.getCardById(context, sessionToken, query)

				if (!viewCardFromId || viewCardFromId.type.split('@')[0] !== 'view') {
					throw new this.jellyfish.errors.JellyfishNoView(`Unknown view: ${query}`)
				}

				return viewCardFromId
			} catch (error) {
				throw new this.jellyfish.errors.JellyfishNoView(`Unknown view: ${query}`)
			}
		}).then(async (schema) => {
			const startDate = new Date()
			const data = await this.jellyfish.query(context, sessionToken, schema, options)
			const endDate = new Date()
			const queryTime = endDate.getTime() - startDate.getTime()
			logger.info(context, 'JSON Schema query', {
				time: queryTime,
				ip: ipAddress,
				schema
			})

			return data
		})
	}
}
