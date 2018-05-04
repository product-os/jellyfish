/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const ava = require('ava')
const jsonSchema = require('../../lib/core/json-schema')
const errors = require('../../lib/core/errors')
const MERGE_TEST_CASES = require('./merge.json')

ava.test('.match() should validate a matching object', (test) => {
	const result = jsonSchema.match({
		type: 'object'
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: true,
		errors: []
	})
})

ava.test('.match() should report back an error if no schema', (test) => {
	const result = jsonSchema.match(null, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'no schema'
		]
	})
})

ava.test('.match() should report back a single error', (test) => {
	const result = jsonSchema.match({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			}
		}
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'data.foo should be number'
		]
	})
})

ava.test('.match() should report back more than one error', (test) => {
	const result = jsonSchema.match({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'data.foo should be number',
			'data should have required property \'bar\''
		]
	})
})

ava.test('.match() should not match if the schema is not a valid JSON Schema', (test) => {
	const result = jsonSchema.match({
		hello: 'foobar'
	}, {
		foo: 'bar'
	})

	test.deepEqual(result, {
		valid: false,
		errors: [
			'invalid schema'
		]
	})
})

ava.test('.isValid() should return true if there is a match', (test) => {
	const result = jsonSchema.isValid({
		type: 'object'
	}, {
		foo: 'bar'
	})

	test.true(result)
})

ava.test('.isValid() should return false if there is no match', (test) => {
	const result = jsonSchema.isValid({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			}
		}
	}, {
		foo: 'bar'
	})

	test.false(result)
})

ava.test('.validate() should not throw if the object matches the schema', (test) => {
	test.notThrows(() => {
		jsonSchema.validate({
			type: 'object'
		}, {
			foo: 'bar'
		})
	})
})

ava.test('.validate() should throw if there is a single error', (test) => {
	test.throws(() => {
		jsonSchema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'number'
				}
			}
		}, {
			foo: 'bar'
		})
	}, errors.JellyfishSchemaMismatch)
})

ava.test('.validate() should throw if there is more than one error', (test) => {
	test.throws(() => {
		jsonSchema.validate({
			type: 'object',
			properties: {
				foo: {
					type: 'number'
				},
				bar: {
					type: 'string'
				}
			},
			required: [ 'foo', 'bar' ]
		}, {
			foo: 'bar'
		})
	}, errors.JellyfishSchemaMismatch)
})

ava.test('.filter() should remove additional properties from a top level object', (test) => {
	const result = jsonSchema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo'
	})
})

ava.test('.filter() should not remove properties given explicit additionalProperties', (test) => {
	const result = jsonSchema.filter({
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	})
})

ava.test('.filter() should not remove properties given explicit additionalProperties and force: true', (test) => {
	const result = jsonSchema.filter({
		type: 'object',
		additionalProperties: true,
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: 'foo',
		baz: 'qux'
	}, {
		force: true
	})

	test.deepEqual(result, {
		foo: 1,
		bar: 'foo'
	})
})

ava.test('.filter() should return null if there is no match', (test) => {
	const result = jsonSchema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 'hello',
		bar: 'foo',
		baz: 'qux'
	})

	test.deepEqual(result, null)
})

ava.test('.filter() should remove additional properties from a nested object', (test) => {
	const result = jsonSchema.filter({
		type: 'object',
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'object',
				properties: {
					baz: {
						type: 'string'
					}
				},
				required: [ 'baz' ]
			}
		},
		required: [ 'foo', 'bar' ]
	}, {
		foo: 1,
		bar: {
			baz: 'hello',
			qux: {
				foo: 'bar'
			}
		},
		baz: 'qux'
	})

	test.deepEqual(result, {
		foo: 1,
		bar: {
			baz: 'hello'
		}
	})
})

_.each(MERGE_TEST_CASES, (testCase, index) => {
	ava.test(`.merge() should merge test case ${index}`, (test) => {
		if (testCase.expected) {
			const result = jsonSchema.merge(testCase.schemas)
			test.deepEqual(result, testCase.expected)
		} else {
			test.throws(() => {
				jsonSchema.merge(testCase.schemas)
			}, errors.JellyfishIncompatibleSchemas)
		}
	})
})

ava.test('.getFormulasPaths() should return an empty array given no formulas', (test) => {
	const paths = jsonSchema.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string'
			},
			bar: {
				type: 'string'
			}
		}
	})

	test.deepEqual(paths, [])
})

ava.test('.getFormulasPaths() should return one property with formulas', (test) => {
	const paths = jsonSchema.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				$formula: 'UPPER(input)'
			},
			bar: {
				type: 'string'
			}
		}
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ]
		}
	])
})

ava.test('.getFormulasPaths() should return nested properties with formulas', (test) => {
	const paths = jsonSchema.getFormulasPaths({
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				$formula: 'UPPER(input)'
			},
			bar: {
				type: 'object',
				properties: {
					baz: {
						type: 'number',
						$formula: 'POW(input, 2)'
					}
				}
			}
		}
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ]
		},
		{
			formula: 'POW(input, 2)',
			output: [ 'bar', 'baz' ]
		}
	])
})

ava.test('.getFormulasPaths() should return properties inside arrays', (test) => {
	const paths = jsonSchema.getFormulasPaths({
		type: 'object',
		anyOf: [
			{
				properties: {
					foo: {
						type: 'string',
						$formula: 'UPPER(input)'
					}
				}
			},
			{
				properties: {
					bar: {
						type: 'string',
						$formula: 'LOWER(input)'
					}
				}
			}
		]
	})

	test.deepEqual(paths, [
		{
			formula: 'UPPER(input)',
			output: [ 'foo' ]
		},
		{
			formula: 'LOWER(input)',
			output: [ 'bar' ]
		}
	])
})
