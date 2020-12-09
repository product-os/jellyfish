/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable max-len */
const SLUG = 'changelog'

module.exports = ({
	mixin, withRelationships, uiSchemaDef
}) => {
	return mixin(withRelationships(SLUG))({
		slug: SLUG,
		name: 'Changelog',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						pattern: '^.*\\S.*$'
					},
					tags: {
						type: 'array',
						items: {
							type: 'string'
						},
						$$formula: 'AGGREGATE($events, \'tags\')'
					},
					data: {
						type: 'object',
						properties: {
							repository: {
								type: 'string',
								enum: [
									'resin-io/balena-demo',
									'resin-io/jellyfish'
								]
							},
							log: {
								type: 'string',
								format: 'markdown'
							},
							version: {
								type: 'string'
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
						repository: {
							$ref: uiSchemaDef('repository')
						},
						version: {
							'ui:widget': 'Badge'
						}
					}
				}
			}
		}
	})
}
