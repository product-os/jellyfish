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
const links = require('../../../lib/core/links')
const helpers = require('./helpers')

ava.test.beforeEach(async (test) => {
	await helpers.kernel.beforeEach(test)
	test.context.context = {
		query: test.context.backend.query.bind(test.context.backend)
	}
})

ava.test.afterEach(helpers.kernel.afterEach)

ava.test('.evaluate() should return an empty array if the link is unknown', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const results = await links.evaluate(test.context.context, input, 'foo bar baz', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava.test('.evaluate(is attached to) should return an empty array if the target does not exist', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	const results = await links.evaluate(test.context.context, input, 'is attached to', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava.test('.evaluate(is attached to) should return an empty array if the target exists but does not match', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card.id
		}
	})

	const results = await links.evaluate(test.context.context, input, 'is attached to', {
		type: 'object',
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'count' ],
				properties: {
					count: {
						type: 'number',
						const: 9
					}
				}
			}
		}
	})

	test.deepEqual(results, [])
})

ava.test('.evaluate(is attached to) should return the declared target properties', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const link = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card.id
		}
	})

	const results = await links.evaluate(test.context.context, input, 'is attached to', {
		type: 'object',
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'greeting', 'count' ],
				properties: {
					greeting: {
						type: 'string'
					},
					count: {
						type: 'number',
						const: 1
					}
				}
			}
		}
	})

	test.deepEqual(results, [
		{
			$link: link.id,
			data: {
				greeting: 'hello',
				count: 1
			}
		}
	])
})

ava.test('.evaluate(is attached to) should return the whole target if additionalProperties is set', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const link = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card.id
		}
	})

	const results = await links.evaluate(test.context.context, input, 'is attached to', {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'count' ],
				properties: {
					count: {
						type: 'number',
						const: 1
					}
				}
			}
		}
	})

	test.deepEqual(results, [
		{
			id: card.id,
			$link: link.id,
			type: 'card',
			active: true,
			links: {},
			tags: [],
			data: {
				greeting: 'hello',
				count: 1
			}
		}
	])
})

ava.test('.evaluate(has attached element) should return an empty array if the card has no timeline', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const results = await links.evaluate(test.context.context, input, 'has attached element', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava.test('.evaluate(has attached element) should return matching elements', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 1
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 2
		}
	})

	const card3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 3
		}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: input.id
		}
	})

	const link2 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: input.id
		}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card3.id,
			to: input.id
		}
	})

	const results = await links.evaluate(test.context.context, input, 'has attached element', {
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			data: {
				type: 'object',
				required: [ 'count' ],
				properties: {
					count: {
						type: 'number',
						const: 2
					}
				}
			}
		}
	})

	test.deepEqual(results, [
		{
			id: card2.id,
			$link: link2.id,
			data: {
				count: 2
			}
		}
	])
})

ava.test('.evaluateCard() should return one link of one type given one match', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const link = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card.id
		}
	})

	const results = await links.evaluateCard(test.context.context, input, {
		'is attached to': {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'greeting' ],
					properties: {
						greeting: {
							type: 'string',
							const: 'hello'
						}
					}
				}
			}
		}
	})

	test.deepEqual(results, {
		'is attached to': [
			{
				$link: link.id,
				data: {
					greeting: 'hello'
				}
			}
		]
	})
})

ava.test('.evaluateCard() should return multiple cards per link', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 1
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 2
		}
	})

	const card3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 3
		}
	})

	const link1 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: input.id
		}
	})

	const link2 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: input.id
		}
	})

	const link3 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card3.id,
			to: input.id
		}
	})

	const results = await links.evaluateCard(test.context.context, input, {
		'has attached element': {
			type: 'object',
			required: [ 'id', 'data' ],
			properties: {
				id: {
					type: 'string'
				},
				data: {
					type: 'object',
					required: [ 'count' ],
					properties: {
						count: {
							type: 'number'
						}
					}
				}
			}
		}
	})

	results['has attached element'] = _.sortBy(results['has attached element'], (card) => {
		return card.data.count
	})

	test.deepEqual(results, {
		'has attached element': [
			{
				id: card1.id,
				$link: link1.id,
				data: {
					count: 1
				}
			},
			{
				id: card2.id,
				$link: link2.id,
				data: {
					count: 2
				}
			},
			{
				id: card3.id,
				$link: link3.id,
				data: {
					count: 3
				}
			}
		]
	})
})

ava.test('.evaluateCard() should return false if one link is unsatisfied', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card1.id
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			count: 1
		}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: input.id,
			to: card2.id
		}
	})

	const results = await links.evaluateCard(test.context.context, input, {
		'has attached element': {
			type: 'object'
		},
		'is attached to': {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'greeting' ],
					properties: {
						greeting: {
							type: 'string',
							const: 'bar'
						}
					}
				}
			}
		}
	})

	test.deepEqual(results, null)
})
