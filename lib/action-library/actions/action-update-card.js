/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
				properties: {
					slug: {
						type: 'string',
						pattern: '^[a-z0-9-]+$'
					},
					version: {
						type: 'string',
						pattern: '^\\d+\\.\\d+\\.\\d+$'
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
					name: {
						type: [ 'string', 'null' ],
						pattern: '^.*\\S.*$'
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
				additionalProperties: false,
				required: []
			}
		}
	},
	requires: [],
	capabilities: []
}
