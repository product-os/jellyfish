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
const helpers = require('../../../../lib/ui/services/helpers')

ava('.createPrefixRegExp() match underscore characters', (test) => {
	const matchRE = helpers.createPrefixRegExp('@')
	const match = matchRE.exec('Lorem ipsum @user_name dolor sit amet')

	test.deepEqual(match[2], '@user_name')
})

ava('.getUpdateObjectFromSchema() should parse the `const` keyword', (test) => {
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

ava('.getUpdateObjectFromSchema() should parse the `contains` keyword', (test) => {
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

ava('.getUserIdsByPrefix() should get user ids by parsing text', (test) => {
	const users = [
		{
			slug: 'user-johndoe',
			id: 'd4b00966-e18f-475a-aa01-7becd3c092d7'
		},
		{
			slug: 'user-janedoe',
			id: 'ad0fe4d4-5da9-4465-8ddf-7b2d7aac49d5'
		}
	]

	const source = '@johndoe'

	const result = helpers.getUserIdsByPrefix('@', source, users)

	test.deepEqual(result, [ 'd4b00966-e18f-475a-aa01-7becd3c092d7' ])
})

ava('.getUserIdsByPrefix() should ignore unknown users', (test) => {
	const users = [
		{
			slug: 'user-johndoe',
			id: 'd4b00966-e18f-475a-aa01-7becd3c092d7'
		},
		{
			slug: 'user-janedoe',
			id: 'ad0fe4d4-5da9-4465-8ddf-7b2d7aac49d5'
		}
	]

	const source = '@foobar'

	const result = helpers.getUserIdsByPrefix('@', source, users)

	test.deepEqual(result, [])
})

ava('.getUserIdsByPrefix() should return an array of unique values', (test) => {
	const users = [
		{
			slug: 'user-johndoe',
			id: 'd4b00966-e18f-475a-aa01-7becd3c092d7'
		},
		{
			slug: 'user-janedoe',
			id: 'ad0fe4d4-5da9-4465-8ddf-7b2d7aac49d5'
		}
	]

	const source = '@johndoe @johndow'

	const result = helpers.getUserIdsByPrefix('@', source, users)

	test.deepEqual(result, [ 'd4b00966-e18f-475a-aa01-7becd3c092d7' ])
})

ava('.getUserIdsByPrefix() should be able to use an exclamation mark as a prefix', (test) => {
	const users = [
		{
			slug: 'user-johndoe',
			id: 'd4b00966-e18f-475a-aa01-7becd3c092d7'
		},
		{
			slug: 'user-janedoe',
			id: 'ad0fe4d4-5da9-4465-8ddf-7b2d7aac49d5'
		}
	]

	const source = '!johndoe'

	const result = helpers.getUserIdsByPrefix('!', source, users)

	test.deepEqual(result, [ 'd4b00966-e18f-475a-aa01-7becd3c092d7' ])
})

ava('.findWordsByPrefix() should ignore # symbols in urls', (test) => {
	const source = 'http://localhost:9000/#/231cd14d-e92a-4a19-bf16-4ce2535bf5c8'

	test.deepEqual(helpers.findWordsByPrefix('#', source), [])
})

ava('.findWordsByPrefix() should ignore @ symbols in email addresses', (test) => {
	const source = 'test@example.com'

	test.deepEqual(helpers.findWordsByPrefix('@', source), [])
})

ava('.findWordsByPrefix() should ignore symbols with no following test', (test) => {
	const source = '!'

	test.deepEqual(helpers.findWordsByPrefix('!', source), [])
})
