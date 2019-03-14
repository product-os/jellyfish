/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const jsonSchemaTestSuite = require('json-schema-test-suite')
const uuid = require('uuid/v4')
const pgp = require('pg-promise')()
const environment = require('../../../../../../lib/environment')
const jsonschema2sql = require('../../../../../../lib/core/backend/postgres/jsonschema2sql')
const cards = require('../../../../../../lib/core/backend/postgres/cards')
const links = require('../../../../../../lib/core/backend/postgres/links')
const errors = require('../../../../../../lib/core/errors')
const IS_POSTGRES = environment.database.type === 'postgres'

/*
 * The list of JSON Schema suites we support. This
 * list represents the JSON Schema keywords that are
 * safe to use in queries.
 *
 * See https://github.com/json-schema-org/JSON-Schema-Test-Suite/tree/master/tests
 * for more details.
 */
/* eslint-disable capitalized-comments, lines-around-comment */
const SUPPORTED_SUITES = [
	// additionalItems
	// additionalProperties
	'allOf',
	'anyOf',
	'boolean_schema',
	'const',
	'contains',
	'default',
	// definitions
	// dependencies
	'enum',
	'exclusiveMaximum',
	'exclusiveMinimum',
	'items',
	'maxItems',
	'maxLength',
	'maxProperties',
	'maximum',
	'minItems',
	'minLength',
	'minProperties',
	'minimum',
	'multipleOf',
	'not',
	// oneOf
	'bignum',
	// ecmascript-regex
	'format',
	'zeroTerminatedFloats',
	'pattern',
	'patternProperties',
	// 'properties',
	'propertyNames',
	// ref
	// refRemote
	'required',
	'type'
	// uniqueItems
]
/* eslint-enable capitalized-comments, lines-around-comment */

const context = {
	id: 'jsonschema2sql-test'
}

const runner = async ({
	connection,
	database,
	elements,
	options,
	schema,
	table
}) => {
	/*
	 * 1. Create the necessary tables for the test.
	 */
	await cards.setup(context, connection, database, {
		table
	})
	await links.setup(context, connection, database, {
		cards: table
	})

	/*
	 * 2. Insert the elements we will try to query.
	 */
	for (const item of elements) {
		await cards.upsert(context, errors, connection, {
			slug: item.slug || `test-${uuid()}`,
			type: item.type,
			active: _.isBoolean(item.active) ? item.active : true,
			version: item.version || '1.0.0',
			name: item.name,
			tags: item.tags || [],
			markers: item.markers || [],
			linked_at: item.linked_at || {},
			created_at: item.created_at || new Date().toISOString(),
			links: item.links || {},
			requires: item.requires || [],
			capabilities: item.capabilities || [],
			data: item.data || {}
		}, {
			table
		})
	}

	/*
	 * 3. Query the elements back using our translator.
	 */
	const query = jsonschema2sql(table, schema, options)

	/*
	 * 4. Return the results.
	 */
	return connection.any(query)
}

ava.before(async (test) => {
	if (!IS_POSTGRES) {
		return
	}

	/*
	 * Create a randomly generated database name where all the
	 * test tables will be scoped. This ensures that can repeately
	 * run the test suite without conflicts.
	 */
	test.context.database = `test_${uuid().replace(/-/g, '')}`

	/*
	 * Connect to the default postgres database and use that
	 * connection to create the randomly generated database.
	 */
	await pgp({
		user: environment.postgres.user,
		password: environment.postgres.password,
		database: 'postgres',
		port: environment.postgres.port
	}).any(`
		CREATE DATABASE ${test.context.database} OWNER = ${environment.postgres.user};
	`)

	/*
	 * Now that the auto-generated database is created, we
	 * can connect to it, and store the connection in the context
	 * so we can use it for queries and insertions.
	 */
	test.context.connection = await pgp({
		user: environment.postgres.user,
		database: test.context.database,
		password: environment.postgres.password,
		port: environment.postgres.port
	})
})

/*
 * The JSON Schema tests are divided in suites, where
 * each of them corresponds to a JSON Schema keyword.
 */
for (const suite of jsonSchemaTestSuite.draft6()) {
	/*
	 * Each suite is then divided in scenarios, which
	 * describe an object, along with a series of schemas
	 * that may or may not match the object.
	 */
	for (const scenario of suite.schemas) {
		/*
		 * Each test case in an scenario contains a boolean
		 * flag to determine whether it should match or
		 * not the scenario's object.
		 */
		for (const testCase of scenario.tests) {
			/*
			 * We will execute each test case in a different
			 * table.
			 */
			const table = [
				suite.name,
				suite.schemas.indexOf(scenario),
				scenario.tests.indexOf(testCase)
			].join('_').replace(/[^0-9a-z_]/gi, '')

			/*
			 * A readable title for the Ava test case
			 */
			const title = [
				`${table}:`,
				scenario.description,
				'-',
				testCase.description
			].join(' ')

			/*
			 * Skip this test case if we don't support that test suite.
			 * We could have omitted it from the suites list in the
			 * first place, but this is a nice way to measure how far
			 * we are from supporting the whole set of tests.
			 */
			const avaTest = SUPPORTED_SUITES.includes(suite.name) && IS_POSTGRES
				? ava : ava.skip

			/*
			 * Run the test without any modification. We will insert
			 * the scenario object, query it back with the test case
			 * schema, and we expect to get a result of the schema
			 * is expected to match.
			 */
			if (_.isPlainObject(testCase.data)) {
				avaTest(`${title} [Normal]`, async (test) => {
					const results = await runner({
						connection: test.context.connection,
						database: test.context.database,
						table,
						elements: [
							{
								version: '1.0.0',
								type: 'card',
								data: testCase.data
							}
						],
						schema: {
							type: 'object',
							required: [ 'id', 'data' ],
							properties: {
								id: {
									type: 'string'
								},
								data: scenario.schema
							}
						}
					})

					test.is(results.length === 1, testCase.valid)
					if (testCase.valid) {
						test.deepEqual(results[0].data, testCase.data)
					}
				})
			}

			/*
			 * Pretty much the same as before, but wrap the scenario
			 * object into another object and wrap the schema
			 * accordingly.
			 */
			avaTest(`${title} [Nested object]`, async (test) => {
				const results = await runner({
					connection: test.context.connection,
					database: test.context.database,
					table: `NESTED_${table}`,
					elements: [
						{
							version: '1.0.0',
							type: 'card',
							data: {
								wrapper: testCase.data
							}
						}
					],
					schema: {
						type: 'object',
						required: [ 'id', 'data' ],
						properties: {
							id: {
								type: 'string'
							},
							data: {
								type: 'object',
								required: [ 'wrapper' ],
								properties: {
									wrapper: scenario.schema
								}
							}
						}
					}
				})

				test.is(results.length === 1, testCase.valid)
				if (testCase.valid) {
					test.deepEqual(results[0].data, {
						wrapper: testCase.data
					})
				}
			})
		}
	}
}

/*
 * Some extra tests not covered by the official JSON Schema test suite.
 */

const avaTest = IS_POSTGRES ? ava : ava.skip

avaTest('injection - should escape malicious query keys', async (test) => {
	const table = 'malicious_queries_0'

	const schema = {
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'Robert\'); DROP TABLE cards; --' ],
				properties: {
					'Robert\'); DROP TABLE cards; --': {
						type: 'object',
						properties: {
							'Robert\'); DROP TABLE cards; --': {
								type: 'string',
								const: 'foo'
							}
						}
					}
				}
			}
		}
	}

	const elements = [
		{
			version: '1.0.0',
			type: 'card',
			data: {
				'Robert\'); DROP TABLE cards; --': {
					'Robert\'); DROP TABLE cards; --': 'foo'
				}
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema
	})

	test.is(results.length, 1)
})

avaTest('injection - should escape malicious query values', async (test) => {
	const table = 'malicious_queries_1'

	const schema = {
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'foo' ],
				properties: {
					foo: {
						type: 'string',
						const: 'Robert\'; DROP TABLE cards; --'
					}
				}
			}
		}
	}

	const elements = [
		{
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 'Robert\'; DROP TABLE cards; --'
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema
	})

	test.is(results.length, 1)
})

avaTest('order - should sort values in ascending order by default when specifying "sortBy"', async (test) => {
	const table = 'order_0'

	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'foo' ],
				properties: {
					foo: {
						type: 'number',
						const: 1
					}
				}
			}
		},
		required: [ 'slug', 'data' ]
	}

	const elements = [
		{
			slug: 'beta',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema,
		options: {
			sortBy: [ 'data', 'timestamp' ]
		}
	})

	test.deepEqual(_.map(results, (item) => {
		return _.pick(item, [ 'slug', 'data' ])
	}), [
		_.pick(elements[2], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[1], [ 'slug', 'data' ])
	])
})

avaTest('order - should be able to sort values in descending order', async (test) => {
	const table = 'order_1'

	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'foo' ],
				properties: {
					foo: {
						type: 'number',
						const: 1
					}
				}
			}
		},
		required: [ 'slug', 'data' ]
	}

	const elements = [
		{
			slug: 'beta',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema,
		options: {
			sortBy: [ 'data', 'timestamp' ],
			sortDir: 'desc'
		}
	})

	test.deepEqual(_.map(results, (item) => {
		return _.pick(item, [ 'slug', 'data' ])
	}), [
		_.pick(elements[1], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[2], [ 'slug', 'data' ])
	])
})

avaTest('order - should be able to sort values by a single string value', async (test) => {
	const table = 'order_2'

	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'foo' ],
				properties: {
					foo: {
						type: 'number',
						const: 1
					}
				}
			}
		},
		required: [ 'slug', 'data' ]
	}

	const elements = [
		{
			slug: 'beta',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 1,
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema,
		options: {
			sortBy: 'slug'
		}
	})

	test.deepEqual(_.map(results, (item) => {
		return _.pick(item, [ 'slug', 'data' ])
	}), [
		_.pick(elements[2], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[1], [ 'slug', 'data' ])
	])
})

avaTest('anyOf - nested anyOfs', async (test) => {
	const table = 'any_of_nested_0'

	const schema = {
		type: 'object',
		required: [ 'slug' ],
		properties: {
			slug: {
				type: 'string',
				pattern: '^foo*'
			}
		},
		anyOf: [
			{
				type: 'object',
				anyOf: [
					{
						type: 'object',
						required: [ 'active' ],
						properties: {
							active: {
								type: 'boolean',
								const: true
							}
						}
					},
					{
						type: 'object',
						required: [ 'name' ],
						properties: {
							name: {
								type: 'string',
								const: 'active'
							}
						}
					}
				]
			}
		]
	}

	const elements = [
		{
			slug: 'foo-1',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'active',
			data: {
				xxx: 'foo'
			}
		},
		{
			slug: 'foo-2',
			version: '1.0.0',
			type: 'card',
			active: false,
			name: 'inactive',
			data: {
				xxx: 'foo'
			}
		},
		{
			slug: 'foo-3',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'inactive',
			data: {
				xxx: 'foo'
			}
		},
		{
			slug: 'foo-4',
			version: '1.0.0',
			type: 'card',
			active: false,
			name: 'active',
			data: {
				xxx: 'foo'
			}
		},
		{
			slug: 'bar-1',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'active',
			data: {
				xxx: 'bar'
			}
		},
		{
			slug: 'bar-2',
			version: '1.0.0',
			type: 'card',
			active: false,
			name: 'inactive',
			data: {
				xxx: 'bar'
			}
		},
		{
			slug: 'bar-3',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'inactive',
			data: {
				xxx: 'bar'
			}
		},
		{
			slug: 'bar-4',
			version: '1.0.0',
			type: 'card',
			active: false,
			name: 'active',
			data: {
				xxx: 'bar'
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema
	})

	test.deepEqual(_.map(results, 'slug'), [
		'foo-1',
		'foo-3',
		'foo-4'
	])
})

avaTest('jsonb_pattern - inside items in a jsonb column', async (test) => {
	const table = 'pattern_items_jsonb'

	const schema = {
		type: 'object',
		required: [ 'id', 'slug', 'type', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'mirrors' ],
				properties: {
					mirrors: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^https'
						}
					}
				}
			}
		}
	}

	const elements = [
		{
			slug: 'test-pattern-1',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'active',
			data: {
				mirrors: []
			}
		},
		{
			slug: 'test-pattern-2',
			version: '1.0.0',
			type: 'card',
			active: true,
			name: 'active',
			data: {
				mirrors: [
					'https://github.com/balena-io/jellyfish-test-github/issues/5998'
				]
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		database: test.context.database,
		table,
		elements,
		schema
	})

	test.deepEqual(_.map(results, 'slug'), [
		'test-pattern-1',
		'test-pattern-2'
	])
})
