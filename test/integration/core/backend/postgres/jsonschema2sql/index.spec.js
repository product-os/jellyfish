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
	'additionalProperties',
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
	'properties',
	'propertyNames',
	// ref
	// refRemote
	'required',
	'type'
	// uniqueItems
]
/* eslint-enable capitalized-comments, lines-around-comment */

const runner = async ({
	connection,
	elements,
	options,
	schema,
	table
}) => {
	/*
	 * 1. Create a unique table for the test.
	 */
	await connection.any(`CREATE TABLE IF NOT EXISTS ${table} (
		id VARCHAR (255) PRIMARY KEY NOT NULL,
		type TEXT NOT NULL,
		active BOOLEAN NOT NULL,
		name TEXT,
		data jsonb NOT NULL)`)

	/*
	 * 2. Insert the elements we will try to query.
	 */
	for (const item of elements) {
		await connection.any(`INSERT INTO ${table} VALUES ($1, $2, $3, $4, $5)`, [
			item.id,
			item.type || 'card',
			_.isBoolean(item.active) ? item.active : true,
			_.isString(item.name) ? item.name : null,
			item.data
		])
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
						table,
						elements: [
							{
								id: uuid(),
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
					table: `NESTED_${table}`,
					elements: [
						{
							id: uuid(),
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
			id: uuid(),
			data: {
				'Robert\'); DROP TABLE cards; --': {
					'Robert\'); DROP TABLE cards; --': 'foo'
				}
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
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
			id: uuid(),
			data: {
				foo: 'Robert\'; DROP TABLE cards; --'
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
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
			type: {
				type: 'string'
			}
		},
		required: [ 'type' ]
	}
	const elements = [
		{
			id: uuid(),
			type: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: uuid(),
			type: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			id: uuid(),
			type: 'alpha',
			data: {
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		table,
		elements,
		schema,
		options: {
			sortBy: [ 'data', 'timestamp' ]
		}
	})

	console.log(results)

	test.deepEqual(results, [
		{
			id: results[0].id,
			type: 'alpha',
			active: true,
			name: null,
			data: {
				timestamp: 1549016100000
			}
		},
		{
			id: results[1].id,
			type: 'beta',
			active: true,
			name: null,
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: results[2].id,
			type: 'gamma',
			active: true,
			name: null,
			data: {
				timestamp: 1549016300000
			}
		}
	])
})

avaTest('order - should be able to sort values in descending order', async (test) => {
	const table = 'order_1'

	const schema = {
		type: 'object',
		properties: {
			type: {
				type: 'string'
			}
		},
		required: [ 'type' ]
	}

	const elements = [
		{
			id: uuid(),
			type: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: uuid(),
			type: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			id: uuid(),
			type: 'alpha',
			data: {
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		table,
		elements,
		schema,
		options: {
			sortBy: [ 'data', 'timestamp' ],
			sortDir: 'desc'
		}
	})

	test.deepEqual(results, [
		{
			id: results[0].id,
			active: true,
			name: null,
			type: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			id: results[1].id,
			active: true,
			name: null,
			type: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: results[2].id,
			active: true,
			name: null,
			type: 'alpha',
			data: {
				timestamp: 1549016100000
			}
		}
	])
})

avaTest('order - should be able to sort values by a single string value', async (test) => {
	const table = 'order_2'

	const schema = {
		type: 'object',
		properties: {
			type: {
				type: 'string'
			}
		},
		required: [ 'type' ]
	}

	const elements = [
		{
			id: uuid(),
			type: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: uuid(),
			type: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			id: uuid(),
			type: 'alpha',
			data: {
				timestamp: 1549016100000
			}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		table,
		elements,
		schema,
		options: {
			sortBy: 'type'
		}
	})

	test.deepEqual(results, [
		{
			id: results[0].id,
			active: true,
			name: null,
			type: 'alpha',
			data: {
				timestamp: 1549016100000
			}
		},
		{
			id: results[1].id,
			active: true,
			name: null,
			type: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			id: results[2].id,
			active: true,
			name: null,
			type: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		}
	])
})

avaTest('anyOf - nested anyOfs', async (test) => {
	const table = 'any_of_nested_0'

	const schema = {
		type: 'object',
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'foo'
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
			id: uuid(),
			type: 'foo',
			active: true,
			name: 'active',
			data: {}
		},
		{
			id: uuid(),
			type: 'foo',
			active: false,
			name: 'inactive',
			data: {}
		},
		{
			id: uuid(),
			type: 'foo',
			active: true,
			name: 'inactive',
			data: {}
		},
		{
			id: uuid(),
			type: 'foo',
			active: false,
			name: 'active',
			data: {}
		},
		{
			id: uuid(),
			type: 'bar',
			active: true,
			name: 'active',
			data: {}
		},
		{
			id: uuid(),
			type: 'bar',
			active: false,
			name: 'inactive',
			data: {}
		},
		{
			id: uuid(),
			type: 'bar',
			active: true,
			name: 'inactive',
			data: {}
		},
		{
			id: uuid(),
			type: 'bar',
			active: false,
			name: 'active',
			data: {}
		}
	]

	const results = await runner({
		connection: test.context.connection,
		table,
		elements,
		schema
	})

	test.deepEqual(results, [
		{
			id: results[0].id,
			type: 'foo',
			active: true,
			name: 'active',
			data: {}
		},
		{
			id: results[1].id,
			type: 'foo',
			active: true,
			name: 'inactive',
			data: {}
		},
		{
			id: results[2].id,
			type: 'foo',
			active: false,
			name: 'active',
			data: {}
		}
	])
})
