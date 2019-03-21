/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'view',
	type: 'type',
	version: '1.0.0',
	name: 'Jellyfish view',
	markers: [],
	tags: [],
	links: {},
	active: true,
	data: {
		schema: {
			description: 'Jellyfish View',
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						actor: {
							type: 'string',
							format: 'uuid'
						},
						namespace: {
							type: 'string'
						},
						anyOf: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										pattern: '^.*\\S.*$'
									},
									schema: {
										type: 'object',
										properties: {
											type: {
												type: 'string',
												const: 'object'
											}
										},
										required: [
											'type'
										]
									}
								},
								additionalProperties: false,
								required: [
									'name',
									'schema'
								]
							}
						},
						allOf: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									name: {
										type: 'string',
										pattern: '^.*\\S.*$'
									},
									schema: {
										type: 'object',
										properties: {
											type: {
												type: 'string',
												const: 'object'
											}
										},
										required: [
											'type'
										]
									}
								},
								additionalProperties: false,
								required: [
									'name',
									'schema'
								]
							}
						},
						types: {
							description: 'A list of data types this view can return',
							type: 'array',
							items: {
								type: 'string'
							}
						},
						lenses: {
							type: 'array',
							items: {
								type: 'string'
							}
						}
					}
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
