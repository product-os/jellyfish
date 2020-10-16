/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */

module.exports = ({
	mixin, withIsPending, uiSchemaDef
}) => {
	return mixin(withIsPending)({
		slug: 'sales-thread',
		name: 'Sales Thread',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: [ 'string', 'null' ],
						fullTextSearch: true
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						},
						fullTextSearch: true
					},
					data: {
						type: 'object',
						properties: {
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
								],
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
						'ui:order': [
							'tags',
							'mirrors',
							'inbox',
							'statusDescription',
							'status'
						],
						inbox: {
							'ui:widget': 'HighlightedName'
						},
						tags: {
							$ref: uiSchemaDef('badgeList')
						},
						mirrors: {
							$ref: uiSchemaDef('mirrors')
						},
						status: {
							'ui:widget': 'Badge'
						},
						environment: {
							'ui:widget': 'Badge'
						}
					}
				}
			},
			slices: [
				'properties.data.properties.status'
			],
			meta: {
				relationships: [
					{
						title: 'Opportunity',
						link: 'is attached to',
						type: 'opportunity'
					}
				]
			}
		}
	})
}
