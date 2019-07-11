/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'create',
	type: 'type',
	version: '1.0.0',
	name: 'The card create event',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						timestamp: {
							type: 'string',
							format: 'date-time'
						},
						target: {
							type: 'string',
							format: 'uuid'
						},
						actor: {
							type: 'string',
							format: 'uuid'
						},
						payload: {
							type: [ 'object', 'array' ]
						}
					},
					required: [
						'timestamp',
						'target',
						'actor'
					]
				}
			},
			additionalProperties: true,
			required: [
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
