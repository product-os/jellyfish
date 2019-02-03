/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'type',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish Card Type',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					pattern: '^[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'type'
				},
				data: {
					type: 'object',
					properties: {
						schema: {
							type: 'object',
							additionalProperties: true
						},
						slices: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					},
					required: [
						'schema'
					]
				}
			},
			required: [
				'slug',
				'type',
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
