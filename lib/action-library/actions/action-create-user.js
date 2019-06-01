/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-create-user',
	type: 'action',
	version: '1.0.0',
	name: 'Create a user',
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
					const: 'user'
				},
				type: {
					type: 'string',
					const: 'type'
				}
			},
			required: [
				'slug',
				'type'
			]
		},
		arguments: {
			username: {
				type: 'string',
				pattern: '^user-[a-zA-Z0-9-]{5,}$'
			},
			email: {
				type: 'string',
				format: 'email'
			},
			password: {
				type: 'object',
				required: [ 'string', 'salt' ],
				properties: {
					string: {
						type: 'string'
					},
					salt: {
						type: 'string'
					}
				}
			}
		}
	},
	requires: [],
	capabilities: []
}
