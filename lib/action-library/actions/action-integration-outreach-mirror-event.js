/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-integration-outreach-mirror-event',
	type: 'action',
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
					const: 'user'
				}
			}
		},
		arguments: {}
	},
	requires: [],
	capabilities: []
}
