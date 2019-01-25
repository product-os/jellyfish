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

ava.beforeEach(async (test) => {
	await helpers.kernel.beforeEach(test)

	test.context.linkContext = {
		getElementsById: async (id, options) => {
			return test.context.backend.getElementsById(test.context.context, id, options)
		}
	}
})

ava.afterEach(helpers.kernel.afterEach)

ava('.evaluate() should return an empty array if the link is unknown', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card'
	})

	const results = await links.evaluate(test.context.linkContext, input, 'foo bar baz', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava('.evaluate(is attached to) should return an empty array if the target does not exist', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card'
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-4a962ad9-20b5-4dd8-a707-bf819593cc84`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: 'card'
			},
			to: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			}
		}
	})

	const results = await links.evaluate(test.context.linkContext, input, 'is attached to', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava('.evaluate(is attached to) should return an empty array if the target exists but does not match', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card'
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	const results = await links.evaluate(test.context.linkContext, input, 'is attached to', {
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

ava('.evaluate(is attached to) should return the declared target properties', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card'
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluate(test.context.linkContext, linkedInput, 'is attached to', {
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
		},
		additionalProperties: false
	})

	test.deepEqual(results, [
		{
			data: {
				greeting: 'hello',
				count: 1
			}
		}
	])
})

ava('.evaluate(is attached to) should return the whole target if additionalProperties is set', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card'
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-has-attached-element-${card.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluate(test.context.linkContext, linkedInput, 'is attached to', {
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
			created_at: card.created_at,
			id: card.id,
			slug: 'foo',
			type: 'card',
			version: '1.0.0',
			active: true,
			links: {
				'has attached element': [
					{
						$link: link.id,
						id: input.id,
						slug: 'bar',
						type: 'card'
					}
				]
			},
			tags: [],
			requires: [],
			capabilities: [],
			markers: [],
			data: {
				greeting: 'hello',
				count: 1
			}
		}
	])
})

ava('.evaluate(has attached element) should return an empty array if the card has no timeline', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card'
	})

	const results = await links.evaluate(test.context.linkContext, input, 'has attached element', {
		type: 'object'
	})

	test.deepEqual(results, [])
})

ava('.evaluate(has attached element) should return matching elements', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {}
	})

	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card',
		data: {
			count: 1
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card',
		data: {
			count: 2
		}
	})

	const card3 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'qux',
		type: 'card',
		data: {
			count: 3
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card1.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card2.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card2.id,
				type: card2.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card3.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card3.id,
				type: card3.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluate(test.context.linkContext, linkedInput, 'has attached element', {
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
				},
				additionalProperties: false
			}
		},
		additionalProperties: false
	})

	test.deepEqual(results, [
		{
			id: card2.id,
			data: {
				count: 2
			}
		}
	])
})

ava('.evaluateCard() should traverse links between cards on different tables', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'session-1234',
		type: 'session',
		version: '1.0.0',
		data: {
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluateCard(test.context.linkContext, linkedInput, {
		'is attached to': {
			type: 'object',
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'actor' ],
					properties: {
						actor: {
							type: 'string',
							const: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
						}
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}
	})

	test.deepEqual(results, {
		'is attached to': [
			{
				data: {
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				}
			}
		]
	})
})

ava('.evaluateCard() should return one link of one type given one match', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card.id,
				type: card.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluateCard(test.context.linkContext, linkedInput, {
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
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}
	})

	test.deepEqual(results, {
		'is attached to': [
			{
				data: {
					greeting: 'hello'
				}
			}
		]
	})
})

ava('.evaluateCard() should return multiple cards per link', async (test) => {
	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card'
	})

	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card',
		data: {
			count: 1
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card',
		data: {
			count: 2
		}
	})

	const card3 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'qux',
		type: 'card',
		data: {
			count: 3
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card1.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card2.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card2.id,
				type: card2.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card3.slug}-is-attached-to-${input.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		tags: [],
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: card3.id,
				type: card3.type
			},
			to: {
				id: input.id,
				type: input.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluateCard(test.context.linkContext, linkedInput, {
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
					},
					additionalProperties: false
				}
			},
			additionalProperties: false
		}
	})

	results['has attached element'] = _.sortBy(results['has attached element'], (card) => {
		return card.data.count
	})

	test.deepEqual(results, {
		'has attached element': [
			{
				id: card1.id,
				data: {
					count: 1
				}
			},
			{
				id: card2.id,
				data: {
					count: 2
				}
			},
			{
				id: card3.id,
				data: {
					count: 3
				}
			}
		]
	})
})

ava('.evaluateCard() should return false if one link is unsatisfied', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card',
		data: {
			greeting: 'hello',
			count: 1
		}
	})

	const input = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'bar',
		type: 'card'
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card1.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		markers: [],
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card1.id,
				type: card1.type
			}
		}
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card',
		data: {
			count: 1
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${input.slug}-is-attached-to-${card2.slug}`,
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: input.id,
				type: input.type
			},
			to: {
				id: card2.id,
				type: card2.type
			}
		}
	})

	const linkedInput = await test.context.backend.getElementById(test.context.context, input.id, {
		type: input.type
	})

	const results = await links.evaluateCard(test.context.linkContext, linkedInput, {
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

ava('.parseCard() should parse a "from" card', (test) => {
	const result = links.parseCard({
		type: 'link',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(result, {
		name: 'is attached to',
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'bar',
		type: 'card'
	})
})

ava('.parseCard() should parse a "to" card', (test) => {
	const result = links.parseCard({
		type: 'link',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(result, {
		name: 'has attached element',
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'bar',
		type: 'card'
	})
})

ava('.parseCard() should return null given an irrelevant card', (test) => {
	const result = links.parseCard({
		type: 'link',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: 'd7ee04d7-e727-444a-b120-c56c03d81f7b',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(result, null)
})

ava('.addLink() should add a link given a "from" card without any links', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '87ca429f-5e46-419a-8f21-b43f68f23001',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given a "from" card without the existing link', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
					slug: 'baz',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
					slug: 'baz',
					type: 'card'
				},
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '87ca429f-5e46-419a-8f21-b43f68f23001',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given a "from" card with the existing link', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc'
				}
			]
		},
		tags: [],
		data: {}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '87ca429f-5e46-419a-8f21-b43f68f23001',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given a "to" card without any links', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given a "to" card without the existing link', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
					slug: 'baz',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
					slug: 'baz',
					type: 'card'
				},
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given a "to" card with the existing link', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
					slug: 'bar'
				}
			]
		},
		tags: [],
		data: {}
	}, {
		id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc',
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '87ca429f-5e46-419a-8f21-b43f68f23001',
					slug: 'foo'
				}
			]
		},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					slug: 'bar',
					type: 'card'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.addLink() should add a link given an irrelevant card', (test) => {
	const card = links.addLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: 'd7ee04d7-e727-444a-b120-c56c03d81f7b',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: 'd7ee04d7-e727-444a-b120-c56c03d81f7b',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "from" card without any links', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "from" card without the existing link', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc'
				}
			]
		},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "from" card with the existing link', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '87ca429f-5e46-419a-8f21-b43f68f23001'
				}
			]
		},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': []
		},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "to" card without any links', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "to" card without the existing link', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc'
				}
			]
		},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: '9cf07e16-681f-4195-83a4-afa1937b05df',
					id: '2bb5f628-1adf-4d48-96c4-90f7ebf7abdc'
				}
			]
		},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given a "to" card with the existing link', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				}
			]
		},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: '87ca429f-5e46-419a-8f21-b43f68f23001',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': []
		},
		tags: [],
		data: {}
	})
})

ava('.removeLink() should remove a link given an irrelevant card', (test) => {
	const card = links.removeLink({
		id: 'c4603d6f-63b0-4613-8885-39ecb46ef276',
		slug: 'link-4a962ad9-20b5-4dd8-a707-bf819593cc84-is-attached-to-87ca429f-5e46-419a-8f21-b43f68f23001',
		type: 'link',
		version: '1.0.0',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			to: {
				id: '87ca429f-5e46-419a-8f21-b43f68f23001',
				type: 'card'
			}
		}
	}, {
		id: 'd7ee04d7-e727-444a-b120-c56c03d81f7b',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	test.deepEqual(card, {
		id: 'd7ee04d7-e727-444a-b120-c56c03d81f7b',
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		tags: [],
		data: {}
	})
})
