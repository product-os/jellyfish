/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

// Defines fields common to all items used in pipelines
module.exports = {
	data: {
		schema: {
			properties: {
				data: {
					type: 'object',
					properties: {
						status: {
							title: 'Status',
							type: 'string',
							default: 'open',
							enum: [
								'open',
								'closed',
								'archived'
							]
						}
					}
				}
			},
			required: [ 'data' ]
		},
		slices: [
			'properties.data.properties.status'
		],
		indexed_fields: [
			[ 'data.status' ]
		]
	}
}
