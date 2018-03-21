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
const utils = require('../lib/utils')

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

	// TODO: Do not rely on kernel directly here
	test.context.kernel = test.context.jellyfish.kernel

	await test.context.jellyfish.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.getTimeline() should return an empty list of the card has no timeline', async (test) => {
	const id = await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	test.deepEqual(await utils.getTimeline(test.context.jellyfish, id), [])
})

ava.test('.getTimeline() should return the timeline ordered by time', async (test) => {
	const id = await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const admin = await test.context.jellyfish.getCard('user-admin')
	test.truthy(admin)

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-03-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-04-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-02-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	const timeline = await utils.getTimeline(test.context.jellyfish, id)

	test.deepEqual(_.map(timeline, 'data.timestamp'), [
		'2018-02-09T19:57:40.963Z',
		'2018-03-09T19:57:40.963Z',
		'2018-04-09T19:57:40.963Z'
	])
})

ava.test('.getTimeline() should return the timeline of an inactive card if the inactive option is true', async (test) => {
	const id = await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: false,
		data: {
			number: 1
		}
	})

	const admin = await test.context.jellyfish.getCard('user-admin')
	test.truthy(admin)

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-03-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-04-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	await test.context.kernel.insertCard({
		type: 'event',
		tags: [],
		links: [],
		active: true,
		data: {
			timestamp: '2018-02-09T19:57:40.963Z',
			target: id,
			actor: admin.id,
			payload: {}
		}
	})

	const timeline = await utils.getTimeline(test.context.jellyfish, id, {
		inactive: true
	})

	test.deepEqual(_.map(timeline, 'data.timestamp'), [
		'2018-02-09T19:57:40.963Z',
		'2018-03-09T19:57:40.963Z',
		'2018-04-09T19:57:40.963Z'
	])
})

ava.test('.getTimeline() should fail if the id does not exist', async (test) => {
	const errors = test.context.jellyfish.errors
	const card = await test.context.jellyfish.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.falsy(card)
	await test.throws(utils.getTimeline(test.context.jellyfish, '4a962ad9-20b5-4dd8-a707-bf819593cc84'), errors.JellyfishNoElement)
})

ava.test('.getTimeline() should fail if the card is inactive and the inactive option is not true', async (test) => {
	const errors = test.context.jellyfish.errors
	const id = await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: false,
		data: {
			number: 1
		}
	})

	await test.throws(utils.getTimeline(test.context.jellyfish, id), errors.JellyfishNoElement)
})
