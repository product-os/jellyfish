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
const formulas = require('../../lib/core/formulas')
const credentials = require('../../lib/core/credentials')

ava.test('.evaluate(): should return null if no input', (test) => {
	const result = formulas.evaluate('POW(input, 2)', {}, [ 'foo' ])
	test.deepEqual(result, null)
})

ava.test('.evaluate(): should resolve a number formula', (test) => {
	const result = formulas.evaluate('POW(input, 2)', {
		number: 2
	}, [ 'number' ])

	test.is(result, 4)
})

ava.test('.evaluate(): should resolve an object formula', (test) => {
	const result = formulas.evaluate('HASH({ string: input.password, salt: input.username })', {
		data: {
			password: 'foo',
			username: 'johndoe'
		}
	}, [ 'data' ])

	test.is(result, credentials.hash('foo', 'johndoe'))
})

ava.test('.evaluate(): should resolve composite formulas', (test) => {
	const result = formulas.evaluate('MAX(POW(input, 2), POW(input, 3))', {
		number: 2
	}, [ 'number' ])

	test.is(result, 8)
})
