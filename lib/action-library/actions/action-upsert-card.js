/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-upsert-card',
	type: 'action',
	version: '1.0.0',
	name: 'Upsert a card',
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
			reason: {
				type: [ 'null', 'string' ]
			},
			properties: {
				type: 'object',
				additionalProperties: false,
				properties: {
					slug: {
						type: 'string',
						pattern: '^[a-z0-9-]+$'
					},
					name: {
						type: [ 'string', 'null' ]
					},
					version: {
						type: 'string'
					},
					active: {
						type: 'boolean'
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
					}
				},
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
