/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */

module.exports = ({
	mixin, withEvents, uiSchemaDef, asPipelineItem
}) => {
	return mixin(withEvents, asPipelineItem)({
		slug: 'support-thread',
		name: 'Support Thread',
		type: 'type@1.0.0',
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
							}
						}
					}
				},
				required: [
					'data'
				]
			},
			uiSchema: {
				fields: {
					data: {
						tags: {
							$ref: uiSchemaDef('badgeList')
						},
						mirrors: {
							$ref: uiSchemaDef('mirrors')
						},
						statusDescription: null,
						category: null,
						status: null,
						inbox: null,
						origin: null,
						environment: null
					}
				}
			},
			indexed_fields: [
				[ 'data.status', 'data.category', 'data.product' ]
			]
		}
	})
}
