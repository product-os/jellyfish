/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-request-password-reset',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Request a password reset',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			username: {
				type: 'string',
				pattern: '[a-z0-9-]+$'
			}
		}
	},
	requires: [],
	capabilities: []
}
