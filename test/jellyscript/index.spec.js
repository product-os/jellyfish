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

const ava = require('ava')
const jellyscript = require('../../lib/jellyscript')

ava.test('HASH: should pass if the password and salt matches', (test) => {
	const options = {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	}

	const hash = jellyscript.evaluate('HASH(input)', options)
	test.deepEqual(jellyscript.evaluate('HASH(input)', options), hash)
})

ava.test('HASH: should not pass if the password do not match', (test) => {
	const hash = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	})

	test.notDeepEqual(jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarqux',
			salt: 'user-foo'
		}
	}), hash)
})

ava.test('HASH: should not pass given a different salt', (test) => {
	const hash = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	})

	test.notDeepEqual(jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-bar'
		}
	}), hash)
})

ava.test('.evaluate(): should return null if no input', (test) => {
	const result = jellyscript.evaluate('POW(input, 2)', {
		context: {},
		input: null
	})

	test.deepEqual(result, {
		value: null
	})
})

ava.test('.evaluate(): should resolve a number formula', (test) => {
	const result = jellyscript.evaluate('POW(input, 2)', {
		context: {
			number: 2
		},
		input: 2
	})

	test.deepEqual(result, {
		value: 4
	})
})

ava.test('.evaluate(): should resolve composite formulas', (test) => {
	const result = jellyscript.evaluate('MAX(POW(input, 2), POW(input, 3))', {
		context: {
			number: 2
		},
		input: 2
	})

	test.deepEqual(result, {
		value: 8
	})
})

ava.test('.evaluate(): should access other properties from the card', (test) => {
	const result = jellyscript.evaluate('ADD(this.value1, this.value2)', {
		context: {
			value1: 2,
			value2: 3
		},
		input: 0
	})

	test.deepEqual(result, {
		value: 5
	})
})

ava.test('AGGREGATE: should ignore duplicates', (test) => {
	const result = jellyscript.evaluate('AGGREGATE(input, PARTIAL(FLIP(PROPERTY), "mentions"))', {
		context: {},
		input: [
			{
				mentions: [ 'foo', 'bar' ]
			},
			{
				mentions: [ 'bar', 'baz' ]
			},
			{
				mentions: [ 'baz', 'qux' ]
			}
		]
	})

	test.deepEqual(result, {
		value: [ 'foo', 'bar', 'baz', 'qux' ]
	})
})

ava.test('AGGREGATE: should aggregate a set of object properties', (test) => {
	const result = jellyscript.evaluate('AGGREGATE(input, PARTIAL(FLIP(PROPERTY), "mentions"))', {
		context: {},
		input: [
			{
				mentions: [ 'foo' ]
			},
			{
				mentions: [ 'bar' ]
			}
		]
	})

	test.deepEqual(result, {
		value: [ 'foo', 'bar' ]
	})
})

ava.test('REGEX_MATCH: should extract a set of mentions', (test) => {
	const result = jellyscript.evaluate('REGEX_MATCH(/(@[a-zA-Z0-9-]+)/g, input)', {
		context: {},
		input: 'Hello @johndoe, and @janedoe'
	})

	test.deepEqual(result, {
		value: [ '@johndoe', '@janedoe' ]
	})
})

ava.test('REGEX_MATCH: should consider duplicates', (test) => {
	const result = jellyscript.evaluate('REGEX_MATCH(/(@[a-zA-Z0-9-]+)/g, input)', {
		context: {},
		input: 'Hello @johndoe, and @janedoe, and @johndoe'
	})

	test.deepEqual(result, {
		value: [ '@johndoe', '@janedoe', '@johndoe' ]
	})
})
