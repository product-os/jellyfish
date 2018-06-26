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
const core = require('../lib/core')
const utils = require('../lib/utils')

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

	test.context.session = test.context.jellyfish.sessions.admin

	await test.context.jellyfish.insertCard(test.context.session,
		require('../default-cards/contrib/event.json'))
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

ava.test('.queryView() should throw if the view does not exist', async (test) => {
	const errors = test.context.jellyfish.errors
	await test.throws(utils.queryView(
		test.context.jellyfish,
		test.context.session,
		'xxxxxxxxxxxxxxxxxxx'
	), errors.JellyfishNoView)
})

ava.test('.queryView() should throw if the view is not of type view', async (test) => {
	const errors = test.context.jellyfish.errors
	const card = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	test.truthy(card.id)
	await test.throws(utils.queryView(test.context.jellyfish, test.context.session, card.id), errors.JellyfishNoView)
})

ava.test('.queryView() should execute a view with one filter', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const card = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'view',
		tags: [],
		links: [],
		active: true,
		data: {
			allOf: [
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

	const results = await utils.queryView(test.context.jellyfish, test.context.session, card.id)
	test.deepEqual(results, [
		{
			data: {
				number: 1
			}
		}
	])
})

ava.test('.queryView() should execute a view with more than one filter', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		tags: [ 'foo' ],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const card = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'view',
		tags: [],
		links: [],
		active: true,
		data: {
			allOf: [
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

	const results = await utils.queryView(test.context.jellyfish, test.context.session, card.id)
	test.deepEqual(results, [
		{
			tags: [ 'foo' ],
			data: {
				number: 1
			}
		}
	])
})
