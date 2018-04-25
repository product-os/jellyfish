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
const _ = require('lodash')
const randomstring = require('randomstring')
const sdk = require('../lib/sdk')

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
	test.context.session = test.context.jellyfish.sessions.admin

	await test.context.jellyfish.insertCard(test.context.session,
		require('../default-cards/contrib/view-read-user-guest.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../default-cards/contrib/view-write-user-guest.json'))
	const guestUserId = await test.context.jellyfish.insertCard(test.context.session,
		require('../default-cards/contrib/user-guest.json'))

	test.context.guestSession = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'session-guest',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: guestUserId
		}
	})
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.query() should only return the user itself for the guest user', async (test) => {
	const results = await test.context.jellyfish.query(test.context.guestSession, {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})

	test.deepEqual(_.map(results, 'slug'), [ 'user-guest' ])
})
