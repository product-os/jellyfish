/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = {
	slug: 'triggered-action-matchmake-task',
	type: 'triggered-action@1.0.0',
	name: 'Triggered action for matchmaking tasks to agents',
	markers: [],
	data: {
		schedule: 'enqueue',
		filter: {
			type: 'object',
			required: [ 'active', 'type', 'data' ],
			properties: {
				active: {
					type: 'boolean',
					const: true
				},
				type: {
					type: 'string',
					const: 'create@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'payload' ],
					properties: {
						payload: {
							type: 'object',
							properties: {
								slug: {
									type: 'string'
								},
								type: {
									type: 'string',
									const: 'task@1.0.0'
								}
							}
						}
					}
				}
			}
		},
		action: 'action-matchmake-task@1.0.0',

		// eslint-disable-next-line
		target: '${source.data.payload.slug}@1.0.0',
		arguments: {}
	}
}
