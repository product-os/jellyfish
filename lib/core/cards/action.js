/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish action',
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
					pattern: '^action-[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'action'
				},
				data: {
					type: 'object',
					properties: {
						extends: {
							type: 'string',
							pattern: '^[a-z0-9-]+$'
						},
						filter: {
							type: 'object'
						},
						arguments: {
							type: 'object',
							patternProperties: {
								'^[a-z0-9]+$': {
									type: 'object'
								}
							}
						}
					},
					required: [
						'arguments'
					]
				}
			},
			additionalProperties: true,
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
