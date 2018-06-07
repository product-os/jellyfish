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
const utils = require('../../lib/core/utils')

ava.test('.jsonSchemaToReqlFilter() should transform const values into a reql filter object', (test) => {
	const schema = {
		type: 'object',
		properties: {
			type: {
				const: 'message'
			},
			data: {
				type: 'object',
				properties: {
					target: {
						const: 'foobarbaz'
					}
				},
				required: [ 'target' ],
				additionalProperties: true
			}
		},
		required: [ 'type', 'data' ],
		additionalProperties: true
	}

	test.deepEqual(utils.jsonSchemaToReqlFilter(schema), {
		type: 'message',
		data: {
			target: 'foobarbaz'
		}
	})
})
