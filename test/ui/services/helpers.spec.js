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

require('ts-node').register()

const ava = require('ava')
const helpers = require('../../../lib/ui/services/helpers')

ava.test('.getUpdateObjectFromSchema() should parse the `const` keyword', (test) => {
	const schema = {
		type: 'object',
		properties: {
			type: {
				const: 'message'
			},
			data: {
				type: 'object',
				properties: {
					number: {
						const: 1
					},
					string: {
						const: 'foobar'
					},
					boolean: {
						const: true
					}
				}
			}
		}
	}

	const result = helpers.getUpdateObjectFromSchema(schema)

	test.deepEqual(result, {
		type: 'message',
		data: {
			number: 1,
			string: 'foobar',
			boolean: true
		}
	})
})

ava.test('.getUpdateObjectFromSchema() should parse the `contains` keyword', (test) => {
	const schema = {
		type: 'object',
		properties: {
			tags: {
				contains: {
					const: 'i/frontend'
				}
			}
		}
	}

	const result = helpers.getUpdateObjectFromSchema(schema)

	test.deepEqual(result, {
		tags: [ 'i/frontend' ]
	})
})
