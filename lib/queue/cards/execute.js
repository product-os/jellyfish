/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'execute',
	type: 'type@1.0.0',
	version: '1.0.0',
	name: 'The card execute event',
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
						originator: {
							type: 'string',
							format: 'uuid'
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
							required: [
								'action',
								'card',
								'timestamp',
								'error',
								'data'
							],
							properties: {
								action: {
									type: 'string',
									anyOf: [
										{
											format: 'uuid'
										},
										{
											pattern: '^[a-z0-9-]+(@\\d+)?(\\.\\d+)?(\\.\\d+)?$'
										}
									]
								},
								card: {
									type: 'string'
								},
								timestamp: {
									type: 'string',
									format: 'date-time'
								},
								error: {
									type: 'boolean'
								},
								data: {
									type: [
										'object',
										'string',
										'number',
										'boolean',
										'array',
										'null'
									]
								}
							}
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
