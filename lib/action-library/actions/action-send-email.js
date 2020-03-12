/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-send-email',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Send email',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			toAddress: {
				type: 'string',
				format: 'email'
			},
			fromAddress: {
				type: 'string',
				format: 'email'
			},
			subject: {
				type: 'string'
			},
			body: {
				type: 'string'
			}
		}
	},
	requires: [],
	capabilities: []
}
