/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

module.exports = ({
	mixin, withEvents
}) => {
	return mixin(withEvents)({
		slug: 'support-thread',
		name: 'Support Thread',
		version: '1.0.0',
		type: 'type@1.0.0',
		markers: [],
		tags: [],
		links: {},
		active: true,
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: [ 'string', 'null' ],
						fullTextSearch: true
					},
					data: {
						type: 'object',
						properties: {
							category: {
								type: 'string',
								default: 'general',
								enum: [
									'general',
									'customer-success',
									'devices',
									'fleetops',
									'security'
								],
								fullTextSearch: true
							},
							tags: {
								type: 'array',
								items: {
									type: 'string'
								},
								fullTextSearch: true
							},
							mirrors: {
								type: 'array',
								items: {
									type: 'string'
								}
							},
							environment: {
								type: 'string',
								enum: [
									'production'
								],
								fullTextSearch: true
							},
							description: {
								type: 'string',
								format: 'markdown',
								fullTextSearch: true
							},
							inbox: {
								type: 'string',
								fullTextSearch: true
							},
							statusDescription: {
								title: 'Current Status',
								type: 'string',
								fullTextSearch: true
							},
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
				required: [
					'data'
				]
			},
			slices: [
				'properties.data.properties.status'
			],
			indexed_fields: [
				[ 'data.status', 'data.category', 'data.product' ]
			]
		},
		requires: [],
		capabilities: []
	})
}
