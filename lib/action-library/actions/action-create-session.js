/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-create-session',
	type: 'action',
	version: '1.0.0',
	name: 'Login as a user',
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
			password: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
