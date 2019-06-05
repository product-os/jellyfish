/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-oauth-associate',
	type: 'action',
	version: '1.0.0',
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
					const: 'user'
				}
			},
			required: [
				'type'
			]
		},
		arguments: {
			provider: {
				type: 'string',
				enum: [ 'outreach' ]
			},
			code: {
				type: 'string'
			},
			origin: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
