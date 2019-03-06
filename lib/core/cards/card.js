/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'card',
	name: 'Jellyfish Card',
	version: '1.0.0',
	markers: [],
	type: 'type',
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					format: 'uuid'
				},
				version: {
					type: 'string',
					pattern: '^\\d+\\.\\d+\\.\\d+$'
				},
				slug: {
					type: 'string',
					pattern: '^[a-z0-9-]+$'
				},
				name: {
					type: 'string'
				},
				type: {
					type: 'string',
					pattern: '^[a-z0-9-]+$'
				},
				tags: {
					type: 'array',
					items: {
						type: 'string'
					}
				},
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				},
				links: {
					type: 'object'
				},
				created_at: {
					type: 'string',
					format: 'date-time'
				},
				updated_at: {
					anyOf: [
						{
							type: 'string',
							format: 'date-time'
						},
						{
							type: 'null'
						}
					]
				},
				active: {
					type: 'boolean'
				},
				requires: {
					type: 'array',
					items: {
						type: 'object'
					}
				},
				capabilities: {
					type: 'array',
					items: {
						type: 'object'
					}
				},
				data: {
					type: 'object',
					additionalProperties: true
				}
			},
			additionalProperties: false,
			required: [
				'active',
				'created_at',
				'slug',
				'capabilities',
				'data',
				'links',
				'markers',
				'requires',
				'tags',
				'type',
				'version'
			]
		}
	},
	requires: [],
	capabilities: []
}
