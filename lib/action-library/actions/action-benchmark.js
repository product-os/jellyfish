/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-benchmark',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Create a new benchmark card',
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
					enum: [ 'type', 'type@1.0.0' ]
				}
			},
			required: [
				'type'
			]
		},
		arguments: {
			reason: {
				type: [ 'null', 'string' ]
			},
			properties: {
				type: 'object',
				additionalProperties: false,
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
					active: {
						type: 'boolean'
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
					markers: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^[a-zA-Z0-9-_/:+]+$'
						}
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						}
					},
					links: {
						type: 'object'
					},
					data: {
						type: 'object'
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
					linked_at: {
						type: 'object'
					}
				},
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
