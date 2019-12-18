/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-ping',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Ping',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		filter: {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: 'ping'
				},
				type: {
					type: 'string',
					enum: [ 'type', 'type@1.0.0' ]
				}
			},
			required: [
				'slug',
				'type'
			]
		},
		arguments: {
			slug: {
				type: 'string',
				pattern: '^ping-[a-z0-9-]+$'
			}
		}
	},
	requires: [],
	capabilities: []
}
