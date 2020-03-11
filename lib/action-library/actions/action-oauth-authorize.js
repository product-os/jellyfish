/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-oauth-authorize',
	type: 'action@1.0.0',
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
					const: 'user@1.0.0'
				}
			},
			required: [
				'type'
			]
		},
		arguments: {
			provider: {
				type: 'string',
				enum: [ 'outreach', 'balena-api' ]
			},
			code: {
				type: 'string'
			},
			origin: {
				type: 'string'
			},
			slug: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
