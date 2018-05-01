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
const expressions = require('../../lib/actions/expressions')
const credentials = require('../../lib/actions/credentials')

ava.test('.compileObject(): should resolve a formula from an object', (test) => {
	const result = expressions.compileObject({
		type: 'object',
		properties: {
			myNumber: {
				type: 'number',
				$formula: 'POW(this, 2)'
			}
		}
	}, {
		myNumber: 2
	})

	test.deepEqual(result, {
		myNumber: 4
	})
})

ava.test('.compileObject(): should resolve a formula with object arguments', (test) => {
	const result = expressions.compileObject({
		type: 'object',
		properties: {
			hash: {
				type: 'string',
				$formula: 'HASH({ string: this.password, salt: this.username })'
			}
		}
	}, {
		hash: {
			password: 'foo',
			username: 'johndoe'
		}
	})

	test.deepEqual(result, {
		hash: credentials.hash('foo', 'johndoe')
	})
})

ava.test('.compileObject(): should resolve composite formulas', (test) => {
	const result = expressions.compileObject({
		type: 'object',
		properties: {
			myNumber: {
				type: 'number',
				$formula: 'MAX(POW(this, 2), POW(this, 3))'
			}
		}
	}, {
		myNumber: 2
	})

	test.deepEqual(result, {
		myNumber: 8
	})
})
