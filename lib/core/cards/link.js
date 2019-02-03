/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'link',
	type: 'type',
	version: '1.0.0',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			type: 'object',
			properties: {
				name: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: '^link-[a-z0-9-]+$'
				},
				type: {
					type: 'string',
					const: 'link'
				},
				links: {
					type: 'object',
					additionalProperties: false,
					properties: {}
				},
				data: {
					type: 'object',
					properties: {
						inverseName: {
							type: 'string'
						},
						from: {
							type: 'object',
							required: [ 'id', 'type' ],
							properties: {
								id: {
									type: 'string',
									format: 'uuid'
								},
								type: {
									type: 'string'
								}
							}
						},
						to: {
							type: 'object',
							required: [ 'id', 'type' ],
							properties: {
								id: {
									type: 'string',
									format: 'uuid'
								},
								type: {
									type: 'string'
								}
							}
						}
					},
					required: [
						'inverseName',
						'from',
						'to'
					]
				}
			},
			required: [
				'name',
				'type',
				'links',
				'data'
			]
		}
	},
	requires: [],
	capabilities: []
}
