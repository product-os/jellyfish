/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-complete-password-reset',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Complete password reset',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			newPassword: {
				type: 'string'
			},
			resetToken: {
				type: 'string',
				pattern: '^[0-9a-fA-F]{64}$'
			}
		}
	},
	requires: [],
	capabilities: []
}
