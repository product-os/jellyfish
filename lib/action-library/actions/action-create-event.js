/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-create-event',
	type: 'action',
	version: '1.0.0',
	name: 'Attach an event to a card',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			tags: {
				type: 'array',
				items: {
					type: 'string'
				}
			},
			slug: {
				type: 'string',
				pattern: '^[a-z0-9-]+$'
			},
			type: {
				type: 'string',
				pattern: '^[a-z0-9-]+$'
			},
			payload: {
				type: 'object'
			}
		},
		required: [ 'type', 'payload' ]
	},
	requires: [],
	capabilities: []
}
