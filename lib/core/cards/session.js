/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'session',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish Session',
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
						actor: {
							type: 'string',
							format: 'uuid'
						},
						expiration: {
							type: 'string',
							format: 'date-time'
						}
					},
					required: [
						'actor'
					]
				}
			},
			required: [
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
