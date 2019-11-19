/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const jsonschema2sql = require('../../../../../../lib/core/backend/postgres/jsonschema2sql')

ava('schema with type array and string const is translated to a query that uses the @> operator', (test) => {
	const query = jsonschema2sql('cards', {
		type: 'object',
		required: [ 'type', 'data' ],
		additionalProperties: true,
		properties:
			{
				type: {
					type: 'string',
					const: 'support-thread'
				},
				data: {
					type: 'object',
					required: [ 'mirrors' ],
					additionalProperties: true,
					properties: {
						mirrors: {
							type: 'array',
							contains: {
								type: 'string',
								const: 'https://api2.frontapp.com/conversations/cnv_2q9efia'
							}
						}
					}
				}
			}
	})

	test.deepEqual(query, `SELECT
*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
((cards.data->'mirrors' IS NOT NULL)
AND
((cards.data->'mirrors' IS NULL)
OR
(cards.data->'mirrors' @> '"https://api2.frontapp.com/conversations/cnv_2q9efia"')))`)
})

ava('schema with type array and number const is translated to a query that uses the @> operator', (test) => {
	const query = jsonschema2sql('cards', {
		type: 'object',
		required: [ 'type', 'data' ],
		additionalProperties: true,
		properties:
			{
				type: {
					type: 'string',
					const: 'support-thread'
				},
				data: {
					type: 'object',
					required: [ 'mirrors' ],
					additionalProperties: true,
					properties: {
						mirrors: {
							type: 'array',
							contains: {
								type: 'number',
								const: 42
							}
						}
					}
				}
			}
	})

	test.deepEqual(query, `SELECT
*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
((cards.data->'mirrors' IS NOT NULL)
AND
((cards.data->'mirrors' IS NULL)
OR
(cards.data->'mirrors' @> '42')))`)
})
