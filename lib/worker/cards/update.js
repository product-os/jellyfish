/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'update',
	type: 'type',
	version: '1.0.0',
	name: 'The card update event',
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
							type: 'object',
							properties: {
								type: {
									type: 'string',
									pattern: '^[a-z0-9-]+$'
								},
								slug: {
									type: 'string',
									pattern: '^[a-z0-9-]+$'
								},
								version: {
									type: 'string'
								},
								name: {
									type: 'string'
								},
								tags: {
									type: 'array',
									items: {
										type: 'string'
									}
								},
								markers: {
									type: 'array',
									items: {
										type: 'string',
										pattern: '^[a-zA-Z0-9-_/:+]+$'
									}
								},
								links: {
									type: 'object'
								},
								active: {
									type: 'boolean'
								},
								created_at: {
									type: 'string',
									format: 'date-time'
								},
								updated_at: {
									anyOf: [
										{
											type: 'string',
											format: 'date-time'
										},
										{
											type: 'null'
										}
									]
								},
								requires: {
									type: 'array',
									items: {
										type: 'object'
									}
								},
								capabilities: {
									type: 'array',
									items: {
										type: 'object'
									}
								},
								data: {
									type: 'object'
								},
								linked_at: {
									type: 'object',
									additionalProperties: true
								}
							},
							additionalProperties: false,
							required: []
						}
					},
					required: [
						'timestamp',
						'target',
						'actor',
						'payload'
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
