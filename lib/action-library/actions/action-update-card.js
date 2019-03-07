/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const schemas = require('@jellyfish/schemas')

module.exports = {
	slug: 'action-update-card',
	type: 'action',
	version: '1.0.0',
	name: 'Update properties of a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			properties: {
				type: 'object',
				properties: schemas.cardSchema().properties,
				additionalProperties: false,
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
