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
const errors = require('../../lib/sdk/errors')

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
			requests: 'requests'
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
				const timeline = await test.context.surface.getTimeline(element.id)
				test.is(timeline.length, 1)
				test.is(timeline[0].type, 'create')
			})
		}
	}
}

ava.test('.getSchema() should return the schema of an existing type card', async (test) => {
	const schema = await test.context.surface.getSchema(CARDS.core.type.slug)
	test.deepEqual(schema, CARDS.core.type.data.schema)
})

ava.test('.getSchema() should return null given an unknown type', async (test) => {
	const element = await test.context.surface.getCard('foobarbazqux')
	test.falsy(element)
	const schema = await test.context.surface.getSchema('foobarbazqux')
	test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null given an known card that is not a type card ', async (test) => {
	const element = await test.context.surface.getCard('user-admin')
	test.truthy(element)
	test.not(element.type, 'type')
	const schema = await test.context.surface.getSchema('user-admin')
	test.deepEqual(schema, null)
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
	await test.throws(test.context.surface.executeAction('xxxxxxxxx', 'event', {
		properties: {
			slug: 'hello'
		}
	}), errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
	await test.context.kernel.insertCard({
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

	await test.throws(test.context.surface.executeAction('action-demo', 'event', {}), errors.JellyfishNoAction)
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

	test.deepEqual(await test.context.surface.getTimeline(id), [])
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

	const admin = await test.context.surface.getCard('user-admin')
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

	const timeline = await test.context.surface.getTimeline(id)

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

	const admin = await test.context.surface.getCard('user-admin')
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

	const timeline = await test.context.surface.getTimeline(id, {
		inactive: true
	})

	test.deepEqual(_.map(timeline, 'data.timestamp'), [
		'2018-02-09T19:57:40.963Z',
		'2018-03-09T19:57:40.963Z',
		'2018-04-09T19:57:40.963Z'
	])
})

ava.test('.getTimeline() should fail if the id does not exist', async (test) => {
	const card = await test.context.surface.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.falsy(card)
	await test.throws(test.context.surface.getTimeline('4a962ad9-20b5-4dd8-a707-bf819593cc84'), errors.JellyfishNoElement)
})

ava.test('.getTimeline() should fail if the card is inactive and the inactive option is not true', async (test) => {
	const id = await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: false,
		data: {
			number: 1
		}
	})

	await test.throws(test.context.surface.getTimeline(id), errors.JellyfishNoElement)
})

ava.test('.queryView() should throw if the view does not exist', async (test) => {
	await test.throws(test.context.surface.queryView('xxxxxxxxxxxxxxxxxxx'), errors.JellyfishNoView)
})

ava.test('.queryView() should throw if the view is not of type view', async (test) => {
	const card = await test.context.surface.getCard('card')
	test.truthy(card.id)
	await test.throws(test.context.surface.queryView(card.id), errors.JellyfishSchemaMismatch)
})

ava.test('.queryView() should execute a view with one filter', async (test) => {
	await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const id = await test.context.kernel.insertCard({
		type: 'view',
		tags: [],
		links: [],
		active: true,
		data: {
			filters: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							data: {
								type: 'object',
								properties: {
									number: {
										type: 'number',
										const: 1
									}
								},
								required: [ 'number' ]
							}
						},
						required: [ 'data' ]
					}
				}
			]
		}
	})

	const results = await test.context.surface.queryView(id)
	test.deepEqual(results, [
		{
			active: true,
			data: {
				number: 1
			}
		}
	])
})

ava.test('.queryView() should execute a view with more than one filter', async (test) => {
	await test.context.kernel.insertCard({
		type: 'card',
		tags: [ 'foo' ],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	await test.context.kernel.insertCard({
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const id = await test.context.kernel.insertCard({
		type: 'view',
		tags: [],
		links: [],
		active: true,
		data: {
			filters: [
				{
					name: 'foo',
					schema: {
						type: 'object',
						properties: {
							data: {
								type: 'object',
								properties: {
									number: {
										type: 'number',
										const: 1
									}
								},
								required: [ 'number' ]
							}
						},
						required: [ 'data' ]
					}
				},
				{
					name: 'bar',
					schema: {
						type: 'object',
						properties: {
							tags: {
								type: 'array',
								contains: {
									type: 'string',
									const: 'foo'
								}
							}
						},
						required: [ 'tags' ]
					}
				}
			]
		}
	})

	const results = await test.context.surface.queryView(id)
	test.deepEqual(results, [
		{
			tags: [ 'foo' ],
			active: true,
			data: {
				number: 1
			}
		}
	])
})
