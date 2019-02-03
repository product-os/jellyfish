/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-integration-import-event',
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
				'type',
				'data'
			],
			properties: {
				type: {
					type: 'string',
					const: 'external-event'
				},
				data: {
					type: 'object',
					required: [
						'source'
					],
					properties: {
						source: {
							type: 'string'
						}
					}
				}
			}
		},
		arguments: {}
	},
	requires: [],
	capabilities: []
}
