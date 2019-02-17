/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const jsonSchemaTestSuite = require('json-schema-test-suite')
const helpers = require('./helpers')

ava.beforeEach(helpers.backend.beforeEach)
ava.afterEach(helpers.backend.afterEach)

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
	// 'additionalProperties',
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

const runner = async (test, elements, schema, options) => {
	for (const element of elements) {
		_.defaults(element, {
			active: true,
			version: '1.0.0',
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			data: {},
			created_at: new Date().toISOString()
		})

		await test.context.backend.insertElement(test.context.context, element)
	}

	const results = await test.context.backend.query(
		test.context.context,
		schema,
		options)

	return results
}

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
			const slug = [
				suite.name,
				suite.schemas.indexOf(scenario),
				scenario.tests.indexOf(testCase)
			].join('-')
				.replace(/[^0-9a-z-]/gi, '')

			/*
			 * A readable title for the Ava test case
			 */
			const title = [
				`${slug}:`,
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
			if (_.isPlainObject(testCase.data)) {
				avaTest(`${title} [Normal]`, async (test) => {
					const results = await runner(test, [
						{
							slug: slug.toLowerCase(),
							version: '1.0.0',
							type: 'card',
							data: testCase.data
						}
					], {
						type: 'object',
						required: [ 'id', 'type', 'data' ],
						properties: {
							id: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'card'
							},
							data: scenario.schema
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
				const results = await runner(test, [
					{
						slug: slug.toLowerCase(),
						version: '1.0.0',
						type: 'card',
						data: {
							wrapper: testCase.data
						}
					}
				], {
					type: 'object',
					required: [ 'id', 'type', 'data' ],
					properties: {
						id: {
							type: 'string'
						},
						type: {
							type: 'string',
							const: 'card'
						},
						data: {
							type: 'object',
							required: [ 'wrapper' ],
							properties: {
								wrapper: scenario.schema
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

ava('injection - should escape malicious query keys', async (test) => {
	const slug = 'malicious-queries-0'

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
			slug,
			version: '1.0.0',
			type: 'card',
			data: {
				'Robert\'); DROP TABLE cards; --': {
					'Robert\'); DROP TABLE cards; --': 'foo'
				}
			}
		}
	]

	const results = await runner(test, elements, schema)
	test.is(results.length, 1)
})

ava('injection - should escape malicious query values', async (test) => {
	const slug = 'malicious-queries-1'

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
			slug,
			version: '1.0.0',
			type: 'card',
			data: {
				foo: 'Robert\'; DROP TABLE cards; --'
			}
		}
	]

	const results = await runner(test, elements, schema)
	test.is(results.length, 1)
})

ava('order - should sort values in ascending order by default when specifying "sortBy"', async (test) => {
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

	const results = await runner(test, elements, schema, {
		sortBy: [ 'data', 'timestamp' ]
	})

	test.deepEqual(results, [
		_.pick(elements[2], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[1], [ 'slug', 'data' ])
	])
})

ava('order - should be able to sort values in descending order', async (test) => {
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

	const results = await runner(test, elements, schema, {
		sortBy: [ 'data', 'timestamp' ],
		sortDir: 'desc'
	})

	test.deepEqual(results, [
		_.pick(elements[1], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[2], [ 'slug', 'data' ])
	])
})

ava('order - should be able to sort values by a single string value', async (test) => {
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

	const results = await runner(test, elements, schema, {
		sortBy: 'slug'
	})

	test.deepEqual(results, [
		_.pick(elements[2], [ 'slug', 'data' ]),
		_.pick(elements[0], [ 'slug', 'data' ]),
		_.pick(elements[1], [ 'slug', 'data' ])
	])
})

ava('anyOf - nested anyOfs', async (test) => {
	const schema = {
		type: 'object',
		additionalProperties: true,
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

	const results = await runner(test, elements, schema)

	test.deepEqual(_.map(results, 'slug'), [
		'foo-1',
		'foo-3',
		'foo-4'
	])
})
