/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-integration-discourse-mirror-event',
	type: 'action@1.0.0',
	version: '1.0.0',
	tags: [],
	markers: [],
	links: {},
	active: true,
	data: {
		filter: {
			type: 'object',
			required: [
				'type'
			],
			properties: {
				type: {
					type: 'string',
					enum: [
						'support-thread@1.0.0',
						'message@1.0.0',
						'whisper@1.0.0'
					]
				}
			}
		},
		arguments: {}
	},
	requires: [],
	capabilities: []
}
