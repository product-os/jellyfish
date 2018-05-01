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
const core = require('../lib/core')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await core.create({
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

ava.test('.query() should be able to see previously restricted cards after a permissions change', async (test) => {
	const userId = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'user-johndoe',
		type: 'user',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			roles: [ 'user-guest' ]
		}
	})

	const adminUser = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')

	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'session-admin-test',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: adminUser.id
		}
	})

	const session = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'session-johndoe',
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor: userId
		}
	})

	const adminSessionBefore = await test.context.jellyfish.getCardBySlug(session, 'session-admin-test')
	test.deepEqual(adminSessionBefore, null)

	await test.context.jellyfish.insertCard(test.context.session, {
		id: userId,
		slug: 'user-johndoe',
		type: 'user',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	}, {
		override: true
	})

	const adminSessionAfter = await test.context.jellyfish.getCardBySlug(session, 'session-admin-test')
	test.deepEqual(adminSessionAfter.slug, 'session-admin-test')
})
