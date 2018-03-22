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

const ava = require('ava')
const cardAction = require('../../lib/sdk/card-action')

ava.test('.getArgumentsSchema() should return a schema out of a single argument definition', (test) => {
	const schema = cardAction.getArgumentsSchema({
		data: {
			arguments: {
				foo: {
					type: 'number'
				}
			}
		}
	})

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: false,
		required: [ 'foo' ],
		properties: {
			foo: {
				type: 'number'
			}
		}
	})
})

ava.test('.getArgumentsSchema() should return a schema out of multiple arguments definition', (test) => {
	const schema = cardAction.getArgumentsSchema({
		data: {
			arguments: {
				foo: {
					type: 'number'
				},
				bar: {
					type: 'string'
				}
			}
		}
	})

	test.deepEqual(schema, {
		type: 'object',
		additionalProperties: false,
		required: [ 'foo', 'bar' ],
		properties: {
			foo: {
				type: 'number'
			},
			bar: {
				type: 'string'
			}
		}
	})
})

ava.test('.getArgumentsSchema() should return a wildcard schema if no arguments', (test) => {
	const schema = cardAction.getArgumentsSchema({
		data: {
			arguments: {}
		}
	})

	test.deepEqual(schema, {
		type: 'object'
	})
})
