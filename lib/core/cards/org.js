/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'org',
	type: 'type',
	version: '1.0.0',
	name: 'Organisation',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				markers: {
					type: 'array',
					items: {
						type: 'string',
						pattern: '^[a-zA-Z0-9-_/:+]+$'
					}
				},
				name: {
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						description: {
							type: 'string'
						}
					}
				}
			},
			required: [
				'name'
			]
		}
	},
	requires: [],
	capabilities: []
}
