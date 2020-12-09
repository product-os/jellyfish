/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable no-template-curly-in-string */
const SLUG = 'repository'

module.exports = ({
	mixin, withRelationships, uiSchemaDef
}) => {
	return mixin(withRelationships(SLUG))({
		slug: SLUG,
		name: 'Github Repository',
		type: 'type@1.0.0',
		markers: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							owner: {
								type: 'string'
							},
							name: {
								type: 'string'
							},
							git_url: {
								type: 'string'
							},
							html_url: {
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
						git_url: {
							$ref: uiSchemaDef('externalUrl')
						},
						html_url: {
							$ref: uiSchemaDef('externalUrl')
						}
					}
				}
			},
			indexed_fields: [
				[ 'data.name' ]
			]
		}
	})
}
