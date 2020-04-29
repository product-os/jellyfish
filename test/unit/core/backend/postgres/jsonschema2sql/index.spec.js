/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const jsonschema2sql = require('../../../../../../lib/core/backend/postgres/jsonschema2sql')

ava('when performing full-text searches we use to_tsvector and to_tsquery functions', (test) => {
	const payload = {
		query: {
			type: 'object',
			additionalProperties: true,
			required: [
				'active',
				'type'
			],
			anyOf: [
				{
					properties: {
						name: {
							type: 'string',
							fullTextSearch: {
								term: 'test'
							}
						}
					},
					required: [
						'name'
					]
				}
			]
		},
		options: {
			limit: 1
		}
	}

	const query = jsonschema2sql('cards', payload.query, payload.options)
	test.truthy(query.includes('to_tsvector'))
	test.truthy(query.includes('to_tsquery'))
})
