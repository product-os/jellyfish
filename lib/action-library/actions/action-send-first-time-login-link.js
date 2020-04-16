/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-send-first-time-login-link',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Send a first-time login link to a user',
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
			}
		},
		arguments: {}
	},
	requires: [],
	capabilities: []
}
