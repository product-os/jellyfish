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
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')
const Surface = require('../../lib/sdk/surface')
const CARDS = require('../../lib/sdk/cards')
const utils = require('../../lib/utils')

ava.test.beforeEach(async (test) => {
	test.context.backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await test.context.backend.connect()
	await test.context.backend.reset()

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	test.context.surface = new Surface(test.context.kernel)
	await test.context.surface.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

for (const category of _.keys(CARDS)) {
	for (const card of _.values(CARDS[category])) {
		ava.test(`should contain the ${category} card ${card.slug} by default`, async (test) => {
			const element = await test.context.surface.getCard(card.slug)
			test.deepEqual(CARDS[category][card.slug], _.omit(element, [ 'id' ]))
		})

		if (category !== 'core') {
			ava.test(`should contain a create event for the ${card.slug} card`, async (test) => {
				const element = await test.context.surface.getCard(card.slug)
				const timeline = await utils.getTimeline(test.context.surface, element.id)
				test.is(timeline.length, 1)
				test.is(timeline[0].type, 'create')
			})
		}
	}
}

ava.test('.getSchema() should return the schema of an existing type card', async (test) => {
	const card = await test.context.surface.getCard(CARDS.core.type.slug)
	const schema = await test.context.surface.getSchema(card)
	test.deepEqual(schema, CARDS.core.type.data.schema)
})

ava.test('.getSchema() should return null given an unknown type', async (test) => {
	const card = await test.context.surface.getCard('foobarbazqux')
	test.falsy(card)
	const schema = await test.context.surface.getSchema(card)
	test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null given an known card that is not a type card ', async (test) => {
	const card = await test.context.surface.getCard('user-admin')
	test.truthy(card)
	test.not(card.type, 'type')
	const schema = await test.context.surface.getSchema(card)
	test.deepEqual(schema, null)
})

ava.test('.getCard() should get a card by its id', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.surface.getCard(id)

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.getCard() should get a card by its slug', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.surface.getCard('johndoe')

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.getCard() should return null if the id is inactive', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.surface.getCard(id)
	test.deepEqual(card, null)
})

ava.test('.getCard() should return an inactive card if the inactive option is true', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.surface.getCard(id, {
		inactive: true
	})

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.getCard() should return null if the id does not exist', async (test) => {
	const card = await test.context.surface.getCard('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
	test.deepEqual(card, null)
})

ava.test('.getCard() should return null if the slug does not exist', async (test) => {
	const card = await test.context.surface.getCard('foobarbazqux')
	test.deepEqual(card, null)
})
