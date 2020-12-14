/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */
const SLUG = 'issue'

module.exports = ({
	mixin, withEvents, withRelationships, uiSchemaDef
}) => {
	return mixin(withEvents, withRelationships(SLUG))({
		slug: SLUG,
		name: 'GitHub Issue',
		type: 'type@1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						pattern: '^.*\\S.*$'
					},
					data: {
						type: 'object',
						properties: {
							repository: {
								type: 'string'
							},
							mirrors: {
								type: 'array',
								items: {
									type: 'string'
								}
							},
							description: {
								type: 'string',
								format: 'markdown'
							},
							status: {
								title: 'Status',
								type: 'string',
								enum: [
									'open',
									'closed'
								]
							},
							archived: {
								type: 'boolean',
								default: false
							}
						},
						required: [
							'repository'
						]
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
							'repository',
							'mirrors',
							'description',
							'status',
							'archived'
						],
						mirrors: {
							$ref: uiSchemaDef('mirrors')
						},
						status: {
							'ui:widget': 'Badge'
						},
						repository: {
							$ref: uiSchemaDef('repository')
						},
						archived: {
							'ui:title': null,
							'ui:widget': 'Badge',
							'ui:value': {
								$if: 'source',
								then: 'Archived',
								else: null
							}
						}
					}
				},
				edit: {
					$ref: '#/data/uiSchema/definitions/form'
				},
				create: {
					$ref: '#/data/uiSchema/edit'
				},
				definitions: {
					form: {
						data: {
							repository: {
								'ui:widget': 'AutoCompleteWidget',
								'ui:options': {
									resource: 'issue',
									keyPath: 'data.repository'
								}
							}
						}
					}
				}
			},
			slices: [
				'properties.data.properties.status'
			]
		}
	})
}
