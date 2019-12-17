/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-get-gravatar',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Set the gravatar url for a user',
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
		arguments: {}
	},
	requires: [],
	capabilities: []
}
