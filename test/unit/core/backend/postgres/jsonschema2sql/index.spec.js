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
cards.id,
cards.slug,
cards.type,
cards.active,
cards.version_major || '.' || cards.version_minor || '.' || cards.version_patch AS version,
cards.name,
cards.tags,
cards.markers,
cards.created_at,
cards.links,
cards.requires,
cards.capabilities,
cards.data,
cards.updated_at,
cards.linked_at
FROM cards
WHERE
(cards.type = 'support-thread')
AND
(cards.data->'mirrors' @> '"https://api2.frontapp.com/conversations/cnv_2q9efia"')`

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
cards.id,
cards.slug,
cards.type,
cards.active,
cards.version_major || '.' || cards.version_minor || '.' || cards.version_patch AS version,
cards.name,
cards.tags,
cards.markers,
cards.created_at,
cards.links,
cards.requires,
cards.capabilities,
cards.data,
cards.updated_at,
cards.linked_at
FROM cards
WHERE
(cards.type = 'support-thread')
AND
(cards.data->'mirrors' @> '42')`

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
(cards.data->'number' @> '1')
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
cards.id,
cards.slug,
cards.type,
cards.active,
cards.version_major || '.' || cards.version_minor || '.' || cards.version_patch AS version,
cards.name,
cards.tags,
cards.markers,
cards.created_at,
cards.links,
cards.requires,
cards.capabilities,
cards.data,
cards.updated_at,
cards.linked_at
FROM cards
WHERE
true`

	test.deepEqual(expected, query)
})

ava('when graph-querying for linked cards, we wrap the main query in a WITH block', (test) => {
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
			experimental: true,
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
), query_0 AS (
SELECT null AS "$link direction$", null AS "$link type$", null::uuid AS "$parent id$", main.* FROM main
)
, query_1_0 AS (
SELECT 'outgoing', links.inversename, links.toid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.fromid AND links.inversename = 'has attached element')
INNER JOIN query_0 on (query_0.id = links.toid)
WHERE cards.type IN ('message', 'create', 'whisper')
UNION ALL
SELECT 'incoming', links.name, links.fromid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.toid AND links.name = 'has attached element')
INNER JOIN query_0 on (query_0.id = links.fromid)
WHERE cards.type IN ('message', 'create', 'whisper')
)
, query_1_1 AS (
SELECT 'outgoing', links.inversename, links.toid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.fromid AND links.inversename = 'is this and that')
INNER JOIN query_0 on (query_0.id = links.toid)
WHERE true
UNION ALL
SELECT 'incoming', links.name, links.fromid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.toid AND links.name = 'is this and that')
INNER JOIN query_0 on (query_0.id = links.fromid)
WHERE true
)
SELECT * FROM query_0
UNION ALL
SELECT * FROM query_1_0
UNION ALL
SELECT * FROM query_1_1`

	const query = jsonschema2sql('cards', payload.query, payload.options)

	test.deepEqual(expected, query)
})

ava('when specifying nested links, we traverse the graph and return the matching verteces', (test) => {
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
					additionalProperties: true,
					$$links: {
						'is this and that': {
							type: 'object',
							additionalProperties: true
						}
					}
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
			experimental: true,
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
), query_0 AS (
SELECT null AS "$link direction$", null AS "$link type$", null::uuid AS "$parent id$", main.* FROM main
)
, query_1_0 AS (
SELECT 'outgoing', links.inversename, links.toid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.fromid AND links.inversename = 'has attached element')
INNER JOIN query_0 on (query_0.id = links.toid)
WHERE cards.type IN ('message', 'create', 'whisper')
UNION ALL
SELECT 'incoming', links.name, links.fromid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.toid AND links.name = 'has attached element')
INNER JOIN query_0 on (query_0.id = links.fromid)
WHERE cards.type IN ('message', 'create', 'whisper')
)
, query_1_0_0 AS (
SELECT 'outgoing', links.inversename, links.toid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.fromid AND links.inversename = 'is this and that')
INNER JOIN query_1_0 on (query_1_0.id = links.toid)
WHERE true
UNION ALL
SELECT 'incoming', links.name, links.fromid, cards.*
FROM cards
INNER JOIN links ON (cards.id = links.toid AND links.name = 'is this and that')
INNER JOIN query_1_0 on (query_1_0.id = links.fromid)
WHERE true
)
SELECT * FROM query_0
UNION ALL
SELECT * FROM query_1_0
UNION ALL
SELECT * FROM query_1_0_0`

	const query = jsonschema2sql('cards', payload.query, payload.options)

	test.deepEqual(expected, query)
})

ava('when querying cards with linked cards, we fetch links with a subquery, and filter with >', (test) => {
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
			experimental: false,
			limit: 100,
			skip: 0,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}

	const expected = `WITH main AS (
SELECT
cards.id,
cards.slug,
cards.type,
cards.active,
cards.version_major || '.' || cards.version_minor || '.' || cards.version_patch AS version,
cards.name,
cards.tags,
cards.markers,
cards.created_at,
cards.links,
cards.requires,
cards.capabilities,
cards.data,
cards.updated_at,
cards.linked_at
, (SELECT array(
SELECT to_jsonb(linked)
FROM cards linked
WHERE (
    linked.id IN (
SELECT toId FROM links
WHERE links.name = 'has attached element' AND fromId = cards.id
UNION
SELECT fromId FROM links
WHERE links.inversename = 'has attached element' AND toId = cards.id
    )
    AND (linked.type IN ('message', 'create', 'whisper'))
))) AS "links.has_attached_element"
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
AND
EXISTS (
SELECT 1 FROM links
WHERE links.name = 'has attached element' AND fromId = cards.id
UNION
SELECT 1 FROM links
WHERE links.inversename = 'has attached element' AND toId = cards.id
)
ORDER BY cards.created_at DESC
)
SELECT * FROM main
WHERE
array_length("links.has_attached_element", 1) > 0
LIMIT 100`

	const query = jsonschema2sql('cards', payload.query, payload.options)

	test.deepEqual(expected, query)
})

ava('when querying cards without linked cards, we fetch links with a subquery, and filter with IS NULL', (test) => {
	const payload = {
		query: {
			type: 'object',
			additionalProperties: true,
			$$links: {
				'has attached element': null
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
			experimental: false,
			limit: 100,
			skip: 0,
			sortBy: [ 'created_at' ],
			sortDir: 'desc'
		}
	}

	const expected = `WITH main AS (
SELECT
cards.id,
cards.slug,
cards.type,
cards.active,
cards.version_major || '.' || cards.version_minor || '.' || cards.version_patch AS version,
cards.name,
cards.tags,
cards.markers,
cards.created_at,
cards.links,
cards.requires,
cards.capabilities,
cards.data,
cards.updated_at,
cards.linked_at
, (SELECT array(
SELECT to_jsonb(linked)
FROM cards linked
WHERE (
    linked.id IN (
SELECT toId FROM links
WHERE links.name = 'has attached element' AND fromId = cards.id
UNION
SELECT fromId FROM links
WHERE links.inversename = 'has attached element' AND toId = cards.id
    )
))) AS "links.has_attached_element"
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
AND
NOT
EXISTS (
SELECT 1 FROM links
WHERE links.name = 'has attached element' AND fromId = cards.id
UNION
SELECT 1 FROM links
WHERE links.inversename = 'has attached element' AND toId = cards.id
)
ORDER BY cards.created_at DESC
)
SELECT * FROM main
WHERE
array_length("links.has_attached_element", 1) IS NULL
LIMIT 100`

	const query = jsonschema2sql('cards', payload.query, payload.options)

	test.deepEqual(expected, query)
})
