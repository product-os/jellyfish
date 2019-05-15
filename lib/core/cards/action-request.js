/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'action-request',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish Action Request',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					pattern: '^action-request-[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'action-request'
				},
				data: {
					type: 'object',
					properties: {
						epoch: {
							type: 'number'
						},
						timestamp: {
							type: 'string',
							format: 'date-time'
						},
						context: {
							type: 'object'
						},
						originator: {
							type: 'string',
							format: 'uuid'
						},
						actor: {
							type: 'string',
							format: 'uuid'
						},
						action: {
							type: 'string'
						},
						input: {
							type: 'object',
							required: [ 'id' ],
							properties: {
								id: {
									type: 'string',
									format: 'uuid'
								}
							}
						},
						arguments: {
							type: 'object'
						}
					},
					required: [
						'epoch',
						'timestamp',
						'context',
						'actor',
						'action',
						'input',
						'arguments'
					]
				}
			},
			additionalProperties: true,
			required: [
				'slug',
				'type',
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
