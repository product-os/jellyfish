/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const jsonschema2sql = require('../../../../../../lib/core/backend/postgres/jsonschema2sql')

ava('when querying for jsonb array field that contains string const we use the @> operator', (test) => {
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

	const expected = `SELECT
*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
((cards.data->'mirrors' IS NOT NULL)
AND
(cards.data->'mirrors' @> '"https://api2.frontapp.com/conversations/cnv_2q9efia"'))`

	test.deepEqual(expected, query)
})

ava('when querying for jsonb array field that contains number const we use the @> operator', (test) => {
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

	const expected = `SELECT
*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
((cards.data->'mirrors' IS NOT NULL)
AND
(cards.data->'mirrors' @> '42'))`
	test.deepEqual(expected, query)
})

ava('when querying for array that contains string const we use the @> operator', (test) => {
	const query = jsonschema2sql('cards', {
		type: 'object',
		anyOf: [ {
			type: 'object'
		} ],
		required: [ 'data', 'tags' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'number' ],
				properties: {
					number: {
						type: 'number', const: 1
					}
				}
			},
			tags: {
				type: 'array',
				contains: {
					type: 'string',
					const: 'foo'
				}
			}
		},
		additionalProperties: false
	})

	const expected = `SELECT
cards."data",
cards."tags"
FROM cards
WHERE
((cards.data->'number' IS NOT NULL)
AND
(cards.data->'number' @> '1'))
AND
(cards.tags @> ARRAY['foo'])`
	test.deepEqual(expected, query)
})

ava('when querying without filters and additionalProperties=false, ' +
	'query should use required to list columns to select', (test) => {
	const query = jsonschema2sql('cards', {
		type: 'object',
		anyOf: [ {
			type: 'object'
		} ],
		required: [ 'data', 'tags' ],
		additionalProperties: false
	})

	const expected = `SELECT
cards."data",
cards."tags"
FROM cards
WHERE
true`
	test.deepEqual(expected, query)
})

ava('when querying without filters and additionalProperties=true, query should select *', (test) => {
	const query = jsonschema2sql('cards', {
		type: 'object',
		anyOf: [ {
			type: 'object'
		} ],
		required: [ 'data', 'tags' ],
		additionalProperties: true
	})

	const expected = `SELECT
*
FROM cards
WHERE
true`
	test.deepEqual(expected, query)
})
