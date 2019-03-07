/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const schemas = require('@jellyfish/schemas')

module.exports = {
	slug: 'action-create-card',
	type: 'action',
	version: '1.0.0',
	name: 'Create a new card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		filter: {
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: 'type'
				}
			},
			required: [
				'type'
			]
		},
		arguments: {
			properties: {
				type: 'object',
				additionalProperties: false,
				properties: schemas.cardSchema().properties,
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
