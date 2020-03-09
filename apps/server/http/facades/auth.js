/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const QueryFacade = require('./query')

module.exports = class AuthFacade extends QueryFacade {
	async whoami (context, sessionToken, ipAddress) {
		const result = await this.jellyfish.getCardById(context, sessionToken, sessionToken)

		if (!result) {
			throw new Error('Could not retrieve session data')
		}

		const schema = {
			type: 'object',
			$$links: {
				'is member of': {
					type: 'object',
					additionalProperties: true
				}
			},
			properties: {
				id: {
					type: 'string',
					const: result.data.actor
				},
				type: {
					type: 'string',
					const: 'user@1.0.0'
				},
				links: {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id' ],
			additionalProperties: true
		}

		// Try and load the user with attached org data, otherwise load them without it.
		// TODO: Fix our broken queries so that we can optionally get linked data
		let user = await this.queryAPI(context, sessionToken, schema, {
			limit: 1
		}, ipAddress)
			.then((elements) => {
				return elements[0] || null
			})

		if (!user) {
			user = await this.jellyfish.getCardById(context, sessionToken, result.data.actor)
		}

		return user
	}
}
