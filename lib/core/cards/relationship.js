/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'relationship',
	type: 'type@1.0.0',
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
					pattern: '^[a-z0-9-]+$'
				},
				type: {
					const: 'relationship@1.0.0'
				},
				data: {
					type: 'object',
					properties: {
						forward: {
							type: 'string'
						},
						reverse: {
							type: 'string'
						},
						types: {
							type: 'array',
							minItems: 2,
							maxItems: 2,
							items: {
								oneOf: [
									{
										type: 'string',
										pattern: '^[a-z0-9-]+$'
									},
									{
										type: 'object',
										properties: {
											name: {
												type: 'string',
												pattern: '^[a-z0-9-]+$'
											},
											title: {
												type: 'string'
											}
										}
									}
								]
							}
						}
					},
					required: [ 'forward', 'reverse', 'types' ]
				}
			},
			required: [ 'name', 'type', 'links', 'data' ]
		}
	}
}
