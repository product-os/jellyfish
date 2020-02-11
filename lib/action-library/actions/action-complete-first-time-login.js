/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-complete-first-time-login',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Complete the first time login of a user',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			newPassword: {
				type: 'string'
			},
			firstTimeLoginToken: {
				type: 'string',
				format: 'uuid'
			}
		}
	},
	requires: [],
	capabilities: []
}
