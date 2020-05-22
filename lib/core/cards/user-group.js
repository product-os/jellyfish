/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'user-group',
	type: 'type@1.0.0',
	version: '1.0.0',
	name: 'User Group',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						name: {
							type: 'string'
						},
						users: {
							type: 'array',
							items: {
								type: 'string',
								pattern: '^user-[a-z0-9-]+$'
							}
						}
					},
					required: [
						'name',
						'users'
					]
				}
			},
			required: [
				'data'
			]
		},
		indexed_fields: [
			[ 'data.users' ]
		]
	},
	requires: [],
	capabilities: []
}
