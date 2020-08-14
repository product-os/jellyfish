/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'event',
	type: 'type@1.0.0',
	name: 'Jellyfish Event',
	data: {
		schema: {
			type: 'object',
			properties: {
				version: {
					type: 'string',
					const: '1.0.0'
				},
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
							type: 'object'
						}
					},
					required: [
						'timestamp',
						'target',
						'actor'
					]
				}
			},
			required: [
				'version',
				'data'
			]
		}
	}
}
