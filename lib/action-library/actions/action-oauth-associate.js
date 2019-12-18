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
					enum: [ 'user', 'user@1.0.0' ]
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
			credentials: {
				type: 'object',
				properties: {
					access_token: {
						type: 'string'
					},
					token_type: {
						type: 'string'
					}
				},
				required: [
					'access_token',
					'token_type'
				]
			}
		}
	},
	requires: [],
	capabilities: []
}
