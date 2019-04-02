/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-broadcast',
	type: 'action',
	version: '1.0.0',
	name: 'Broadcast a message',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		arguments: {
			message: {
				type: 'string'
			}
		},
		required: [ 'message' ]
	},
	requires: [],
	capabilities: []
}
