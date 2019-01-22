/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const ava = require('ava')
const jsonSchemaTestSuite = require('json-schema-test-suite')
const uuid = require('uuid/v4')
const pgp = require('pg-promise')()
const translator = require('../../../lib/jsonschema2sql')
const format = require('pg-format').literal

const SUPPORTED_SUITES = [
	'allOf',
	'anyOf',
	'const',
	'default',
	'enum',
	'maxLength',
	'maximum',
	'minLength',
	'minimum',
	'not',
	'pattern',
	'patternProperties',
	'required',
	'type'
]

const suites = jsonSchemaTestSuite.draft6()

const createTable = async (connection, table) => {
	await connection.any(`
		CREATE TABLE IF NOT EXISTS ${table} (
			id SERIAL PRIMARY KEY,
			card_data jsonb
		)
	`)
}

const context = {
	database: `test_${uuid().replace(/-/g, '')}`
}

const runner = async ({
	connection,
	elements,
	options,
	schema,
	table
}) => {
	await createTable(connection, table)

	for (const item of elements) {
		await connection.any(
			`INSERT INTO ${table} (card_data) VALUES (${format(JSON.stringify(item))})`
		)
	}

	const query = translator(table, schema, options)

	const results = await connection.any(query)

	return results
}

ava.before(async () => {
	await pgp({
		user: 'postgres'
	}).any(`
		CREATE DATABASE ${context.database} OWNER = postgres;
	`)

	context.connection = pgp({
		user: 'postgres',
		database: context.database
	})
})

suites.forEach(async (suite) => {
	suite.schemas.forEach((testSet, setIndex) => {
		testSet.tests.forEach((testCase, caseIndex) => {
			const title = `${suite.name}: ${testSet.description} - ${testCase.description} (${setIndex}_${caseIndex})`
			const supported = _.includes(SUPPORTED_SUITES, suite.name)
			const cmd = supported ? ava : ava.skip
			cmd(title, async (test) => {
				const table = `${suite.name}_${setIndex}_${caseIndex}`.replace(/[^0-9a-z_]/gi, '')

				const results = await runner({
					connection: context.connection,
					table,
					elements: [ testCase.data ],
					schema: testSet.schema
				})

				test.is(results.length === 1, testCase.valid)
			})

			// Test that all the schema suite tests pass when the data and schema are nested
			// inside an object
			cmd(`[Nested object] ${title}`, async (test) => {
				const table = `NO_${suite.name}_${setIndex}_${caseIndex}`.replace(/[^0-9a-z_]/gi, '')

				const schema = {
					type: 'object',
					properties: {
						wrapper: testSet.schema
					}
				}

				const elements = [
					{
						wrapper: testCase.data
					}
				]

				const results = await runner({
					connection: context.connection,
					table,
					elements,
					schema
				})

				test.is(results.length === 1, testCase.valid)
			})
		})
	})
})

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
		connection: context.connection,
		table,
		elements,
		schema
	})

	test.true(results.length === 1)
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
		connection: context.connection,
		table,
		elements,
		schema
	})

	test.true(results.length === 1)
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
		connection: context.connection,
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
		connection: context.connection,
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
		connection: context.connection,
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

ava('const - should work with boolean types', async (test) => {
	const table = 'test_1'
	const schema = {
		"type": "object",
		"properties": {
			"data": {
				"type": "object",
				"properties": {
					"thread": {
						"type": "boolean",
						"const": true
					}
				}
			}
		}
	}

	const elements = [
		{
			slug: 'bar',
			type: 'card',
			data: {
				number: 2,
				thread: true
			}
		}
	]

	const results = await runner({
		connection: context.connection,
		table,
		elements,
		schema
	})

	test.is(results.length, 1)
})
