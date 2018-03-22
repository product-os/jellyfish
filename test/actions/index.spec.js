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
const randomstring = require('randomstring')
const sdk = require('../../lib/sdk')
const actions = require('../../lib/actions')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await sdk.create({
		backend: {
			host: process.env.TEST_DB_HOST,
			port: process.env.TEST_DB_PORT,
			database: `test_${randomstring.generate()}`
		},
		tables: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	await test.context.jellyfish.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
	await test.throws(actions.executeAction(test.context.jellyfish, 'xxxxxxxxx', 'event', {
		properties: {
			slug: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
	await test.context.jellyfish.insertCard({
		slug: 'action-demo',
		type: 'action',
		tags: [],
		links: [],
		active: true,
		data: {
			arguments: {},
			options: {
				foo: 'bar'
			}
		}
	})

	await test.throws(actions.executeAction(
		test.context.jellyfish,
		'action-demo',
		'event',
		{}
	), test.context.jellyfish.errors.JellyfishNoAction)
})
