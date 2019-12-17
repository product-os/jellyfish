/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-set-password',
	type: 'action@1.0.0',
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
					enum: [ 'user', 'user@1.0.0' ]
				}
			},
			required: [
				'type'
			]
		},
		arguments: {
			currentPassword: {
				type: [ 'string', 'null' ]
			},
			newPassword: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
