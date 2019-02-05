/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const jsonSchemaTestSuite = require('json-schema-test-suite')
const uuid = require('uuid/v4')
const pgp = require('pg-promise')()
const format = require('pg-format').literal
const environment = require('../../../lib/environment')
const jsonschema2sql = require('../../../lib/jsonschema2sql')

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
	// properties
	// propertyNames
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
		id SERIAL PRIMARY KEY,
		card_data jsonb
	)`)

	/*
	 * 2. Insert the elements we will try to query.
	 */
	for (const item of elements) {
		await connection.any(
			`INSERT INTO ${table} (card_data) VALUES (${format(JSON.stringify(item))})`)
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
			const avaTest = SUPPORTED_SUITES.includes(suite.name)
				? ava : ava.skip

			/*
			 * Run the test without any modification. We will insert
			 * the scenario object, query it back with the test case
			 * schema, and we expect to get a result of the schema
			 * is expected to match.
			 */
			avaTest(`${title} [Normal]`, async (test) => {
				const results = await runner({
					connection: test.context.connection,
					table,
					elements: [ testCase.data ],
					schema: scenario.schema
				})

				test.is(results.length === 1, testCase.valid)
				if (testCase.valid) {
					test.deepEqual(results[0].card_data, testCase.data)
				}
			})

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
							wrapper: testCase.data
						}
					],
					schema: {
						type: 'object',
						properties: {
							wrapper: scenario.schema
						}
					}
				})

				test.is(results.length === 1, testCase.valid)
				if (testCase.valid) {
					test.deepEqual(results[0].card_data, {
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

ava('injection - should escape malicious query keys', async (test) => {
	const table = 'malicious_queries_0'

	const schema = {
		type: 'object',
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

	const elements = [
		{
			'Robert\'); DROP TABLE cards; --': {
				'Robert\'); DROP TABLE cards; --': 'foo'
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

ava('injection - should escape malicious query values', async (test) => {
	const table = 'malicious_queries_1'

	const schema = {
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				const: 'Robert\'; DROP TABLE cards; --'
			}
		},
		required: [ 'foo' ]
	}

	const elements = [
		{
			foo: 'Robert\'; DROP TABLE cards; --'
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

ava('order - should sort values in ascending order by default when specifying "sortBy"', async (test) => {
	const table = 'order_0'
	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			}
		},
		required: [ 'slug' ]
	}
	const elements = [
		{
			slug: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
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

	test.deepEqual(results, [
		{
			card_data: {
				slug: 'alpha',
				data: {
					timestamp: 1549016100000
				}
			}
		},
		{
			card_data: {
				slug: 'beta',
				data: {
					timestamp: 1549016200000
				}
			}
		},
		{
			card_data: {
				slug: 'gamma',
				data: {
					timestamp: 1549016300000
				}
			}
		}
	])
})

ava('order - should be able to sort values in descending order', async (test) => {
	const table = 'order_1'

	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			}
		},
		required: [ 'slug' ]
	}

	const elements = [
		{
			slug: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
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
			card_data: {
				slug: 'gamma',
				data: {
					timestamp: 1549016300000
				}
			}
		},
		{
			card_data: {
				slug: 'beta',
				data: {
					timestamp: 1549016200000
				}
			}
		},
		{
			card_data: {
				slug: 'alpha',
				data: {
					timestamp: 1549016100000
				}
			}
		}
	])
})

ava('order - should be able to sort values by a single string value', async (test) => {
	const table = 'order_2'

	const schema = {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			}
		},
		required: [ 'slug' ]
	}

	const elements = [
		{
			slug: 'beta',
			data: {
				timestamp: 1549016200000
			}
		},
		{
			slug: 'gamma',
			data: {
				timestamp: 1549016300000
			}
		},
		{
			slug: 'alpha',
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
			sortBy: 'slug'
		}
	})

	test.deepEqual(results, [
		{
			card_data: {
				slug: 'alpha',
				data: {
					timestamp: 1549016100000
				}
			}
		},
		{
			card_data: {
				slug: 'beta',
				data: {
					timestamp: 1549016200000
				}
			}
		},
		{
			card_data: {
				slug: 'gamma',
				data: {
					timestamp: 1549016300000
				}
			}
		}
	])
})
