/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-set-password',
	type: 'action',
	version: '1.0.0',
	name: 'Set user password',
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
			currentPassword: {
				type: 'string'
			},
			newPassword: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
