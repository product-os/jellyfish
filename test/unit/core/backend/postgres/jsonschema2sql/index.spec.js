/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const jsonschema2sql = require('../../../../../../lib/core/backend/postgres/jsonschema2sql')

ava('when querying for jsonb array field that contains string const we use the @> operator', (test) => {
	const {
		query
	} = jsonschema2sql('cards', {
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
cards.*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
(cards.data->'mirrors' @> '"https://api2.frontapp.com/conversations/cnv_2q9efia"')`

	test.deepEqual(expected, query)
})

ava('when querying for jsonb array field that contains number const we use the @> operator', (test) => {
	const {
		query
	} = jsonschema2sql('cards', {
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
cards.*
FROM cards
WHERE
(cards.type = 'support-thread')
AND
(cards.data->'mirrors' @> '42')`
	test.deepEqual(expected, query)
})

ava('when querying for array that contains string const we use the @> operator', (test) => {
	const {
		query
	} = jsonschema2sql('cards', {
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
(cards.data->'number' @> '1')
AND
(cards.tags @> ARRAY['foo'])`
	test.deepEqual(expected, query)
})

ava('when querying without filters and additionalProperties=false, ' +
	'query should use required to list columns to select', (test) => {
	const {
		query
	} = jsonschema2sql('cards', {
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
	const {
		query
	} = jsonschema2sql('cards', {
		type: 'object',
		anyOf: [ {
			type: 'object'
		} ],
		required: [ 'data', 'tags' ],
		additionalProperties: true
	})

	const expected = `SELECT
cards.*
FROM cards
WHERE
true`
	test.deepEqual(expected, query)
})

ava('when querying for linked cards, we wrap the main query in a WITH block', (test) => {
	const payload = {
		query: {
			type: 'object',
			additionalProperties: true,
			$$links: {
				'has attached element': {
					type: 'object',
					properties: {
						type: {
							enum: [ 'message', 'create', 'whisper' ]
						}
					},
					additionalProperties: true
				},
				'is this and that': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'active', 'type' ],
			name: 'user-generated-filter',
			title: 'is',
			description: 'Status is open',
			properties: {
				data: {
					type: 'object',
					properties: {
						product: {
							const: 'balenaCloud'
						},
						category: {
							const: 'general'
						},
						status: {
							const: 'open'
						}
					}
				},
				type: {
					type: 'string',
					const: 'support-thread'
				},
				active: {
					type: 'boolean',
					const: true
				}
			}
		},
		options: {
			limit: 100,
			skip: 0,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}

	const expected = `WITH main AS (
SELECT
cards.*
FROM cards
WHERE
(((cards.data->'product' IS NULL)
OR
(cards.data->'product' @> '"balenaCloud"'))
AND
((cards.data->'category' IS NULL)
OR
(cards.data->'category' @> '"general"'))
AND
((cards.data->'status' IS NULL)
OR
(cards.data->'status' @> '"open"')))
AND
(cards.type = 'support-thread')
AND
(cards.active = 'true')
ORDER BY cards.created_at DESC
LIMIT 100
)
SELECT null AS "$link direction$", null AS "$link type$", main.id AS "$main id$", main.* FROM main
UNION ALL
SELECT 'outgoing', 'has attached element', links.fromid, cards.*
FROM cards
INNER JOIN links ON (links.toid = cards.id AND links.name = 'has attached element')
WHERE links.fromid IN (SELECT id FROM main)
AND cards.type IN ('message', 'create', 'whisper')
UNION ALL
SELECT 'incoming', 'has attached element', links.toid, cards.*
FROM cards
INNER JOIN links ON (links.fromid = cards.id AND links.inverseName = 'has attached element')
WHERE links.toid IN (SELECT id FROM main)
AND cards.type IN ('message', 'create', 'whisper')
UNION ALL
SELECT 'outgoing', 'is this and that', links.fromid, cards.*
FROM cards
INNER JOIN links ON (links.toid = cards.id AND links.name = 'is this and that')
WHERE links.fromid IN (SELECT id FROM main)
AND true
UNION ALL
SELECT 'incoming', 'is this and that', links.toid, cards.*
FROM cards
INNER JOIN links ON (links.fromid = cards.id AND links.inverseName = 'is this and that')
WHERE links.toid IN (SELECT id FROM main)
AND true`

	const {
		query
	} = jsonschema2sql('cards', payload.query, payload.options)

	test.deepEqual(expected, query)
})
