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
const Bluebird = require('bluebird')
const errors = require('../../../lib/core/errors')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

ava.beforeEach(helpers.kernel.beforeEach)
ava.afterEach(helpers.kernel.afterEach)

for (const card of _.values(CARDS)) {
	ava(`should contain the ${card.slug} card by default`, async (test) => {
		const element = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, card.slug)
		test.deepEqual(CARDS[card.slug], _.omit(element, [ 'id' ]))
	})
}

ava('should be able to disconnect the kernel multiple times without errors', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
	})
})

ava('.disconnect() should gracefully close streams', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.stream(test.context.kernel.sessions.admin, {
			type: 'object'
		})
		await test.context.kernel.disconnect()
	})
})

ava('.insertCard() should throw an error if the element is not a valid card', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		hello: 'world'
	}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'action-foo-bar',
		type: 'action',
		version: '1.0.0',
		data: {}
	})), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'foobarbazqux',
		version: '1.0.0',
		active: true,
		data: {}
	})), errors.JellyfishUnknownCardType)
})

ava('.insertCard() should be able to insert a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'hello-world',
		type: 'card',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	}))

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should throw if the card already exists', async (test) => {
	const card = test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, card)
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.kernel.sessions.admin,
		card
	), errors.JellyfishElementAlreadyExists)
})

ava('.insertCard() should replace an element given override is true', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}), {
		override: true
	})

	test.is(card1.id, card2.id)
	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)
	test.deepEqual(element, card2)
})

ava('.insertCard() should be able to create a link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}))

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
})

ava('.insertCard() should update links property when linking two cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}))

	const element1 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)
	const element2 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card2.id)

	test.deepEqual(element1, {
		id: card1.id,
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: linkCard.id,
					id: card2.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})

	test.deepEqual(element2, {
		id: card2.id,
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: linkCard.id,
					id: card1.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should update links property when linking a valid card to an invalid one', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-4a962ad9-20b5-4dd8-a707-bf819593cc84`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	}))

	const element1 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)

	test.deepEqual(element1, {
		id: card1.id,
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: linkCard.id,
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should update links property when linking an invalid card to a valid one', async (test) => {
	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-4a962ad9-20b5-4dd8-a707-bf819593cc84-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			to: card2.id
		}
	}))

	const element2 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card2.id)

	test.deepEqual(element2, {
		id: card2.id,
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: linkCard.id,
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should update links property when linking two cards in two different ways', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}))

	const linkCard2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-related-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is related to',
		data: {
			inverseName: 'is related to',
			from: card1.id,
			to: card2.id
		}
	}))

	const element1 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)
	const element2 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card2.id)

	test.deepEqual(element1, {
		id: card1.id,
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [
				{
					$link: linkCard1.id,
					id: card2.id
				}
			],
			'is related to': [
				{
					$link: linkCard2.id,
					id: card2.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})

	test.deepEqual(element2, {
		id: card2.id,
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [
				{
					$link: linkCard1.id,
					id: card1.id
				}
			],
			'is related to': [
				{
					$link: linkCard2.id,
					id: card1.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should be able to remove a link', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}))

	const linkCard2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-related-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is related to',
		data: {
			inverseName: 'is related to',
			from: card1.id,
			to: card2.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		id: linkCard1.id,
		type: 'link',
		version: '1.0.0',
		active: false,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}), {
		override: true
	})

	const element1 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)
	const element2 = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card2.id)

	test.deepEqual(element1, {
		id: card1.id,
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'is attached to': [],
			'is related to': [
				{
					$link: linkCard2.id,
					id: card2.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})

	test.deepEqual(element2, {
		id: card2.id,
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {
			'has attached element': [],
			'is related to': [
				{
					$link: linkCard2.id,
					id: card1.id
				}
			]
		},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should be able to create a direction-less link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-linked-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is linked to',
		data: {
			inverseName: 'is linked to',
			from: card1.id,
			to: card2.id
		}
	}))

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
	test.is(element.name, element.data.inverseName)
})

ava('.insertCard() should be able to create two different links between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar-baz',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const linkCard1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-linked-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is linked to',
		data: {
			inverseName: 'has been linked to',
			from: card1.id,
			to: card2.id
		}
	}))

	const linkCard2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	}))

	test.is(linkCard1.data.from, linkCard2.data.from)
	test.is(linkCard1.data.to, linkCard2.data.to)
})

ava('.insertCard() should not add a link if not inserting a card with a target', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			foo: card1.id
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'link'
			}
		}
	})

	test.deepEqual(results, [])
})

ava('.insertCard() should add a link if inserting a card with a target for the first time', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			target: card1.id
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'link'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			version: '1.0.0',
			name: 'is attached to',
			active: true,
			links: {},
			markers: [],
			tags: [],
			requires: [],
			capabilities: [],
			data: {
				inverseName: 'has attached element',
				from: card2.id,
				to: card1.id
			}
		}
	])
})

ava('.insertCard() should not add the target link more than once if multiple equal insertions', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			target: card1.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		id: card2.id,
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			target: card1.id
		}
	}), {
		override: true
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		id: card2.id,
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			target: card1.id
		}
	}), {
		override: true
	})

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'link'
			}
		}
	})

	test.deepEqual(results, [
		test.context.kernel.defaults({
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: card2.id,
				to: card1.id
			}
		})
	])
})

ava('.insertCard() should update the link if the target changes', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		type: 'card',
		slug: 'foo',
		version: '1.0.0',
		data: {}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		type: 'card',
		slug: 'bar',
		version: '1.0.0',
		data: {}
	}))

	const card3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		type: 'card',
		slug: 'baz',
		version: '1.0.0',
		data: {
			target: card1.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		id: card3.id,
		type: 'card',
		slug: 'baz',
		version: '1.0.0',
		data: {
			target: card2.id
		}
	}), {
		override: true
	})

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'link'
			}
		}
	})

	test.deepEqual(results, [
		test.context.kernel.defaults({
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: card3.id,
				to: card2.id
			}
		})
	])
})

ava('.insertCard() read access on a property should not allow to write other properties', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-read-user-johndoe',
		type: 'view',
		version: '1.0.0',
		data: {
			anyOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						properties: {
							slug: {
								type: 'string',
								anyOf: [
									{
										const: 'user'
									}
								]
							},
							type: {
								type: 'string',
								const: 'type'
							},
							data: {
								type: 'object',
								properties: {
									schema: {
										type: 'object',
										additionalProperties: true
									}
								},
								required: [ 'schema' ]
							}
						},
						additionalProperties: true,
						required: [ 'slug', 'type', 'data' ]
					}
				},
				{
					name: 'User IDs',
					schema: {
						type: 'object',
						properties: {
							id: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user'
							}
						},
						additionalProperties: false,
						required: [ 'id', 'type' ]
					}
				}
			]
		}
	}))

	const userCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'user-johndoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	}))

	const targetUserCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'user-janedoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'janedoe@example.com',
			roles: []
		}
	}))

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: userCard.id
		}
	}))

	await test.throwsAsync(test.context.kernel.insertCard(session.id, test.context.kernel.defaults({
		id: targetUserCard.id,
		slug: 'user-janedoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'pwned@example.com',
			roles: []
		}
	}), {
		override: true
	}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should restrict the visibility of the user using write roles', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-read-user-johndoe',
		type: 'view',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						properties: {
							slug: {
								type: 'string',
								anyOf: [
									{
										const: 'user'
									},
									{
										const: 'type'
									}
								]
							},
							type: {
								type: 'string',
								const: 'type'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						},
						required: [ 'slug', 'type', 'data' ]
					}
				}
			]
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-write-user-johndoe',
		type: 'view',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						properties: {
							slug: {
								type: 'string',
								anyOf: [
									{
										const: 'type'
									}
								]
							},
							type: {
								type: 'string',
								const: 'type'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						},
						required: [ 'slug', 'type', 'data' ]
					}
				}
			]
		}
	}))

	const userCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'user-johndoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	}))

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: userCard.id
		}
	}))

	const readUserType = await test.context.kernel.getCardBySlug(session.id, 'user')
	test.is(readUserType.slug, 'user')

	const writeUserType = await test.context.kernel.getCardBySlug(session.id, 'user', {
		writeMode: true
	})

	test.deepEqual(writeUserType, null)

	await test.throwsAsync(test.context.kernel.insertCard(session.id, test.context.kernel.defaults({
		slug: 'user-janedoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'janedoe@example.com',
			roles: []
		}
	}), {
		writeMode: true
	}), errors.JellyfishUnknownCardType)
})

ava('.getCardBySlug() there should be an admin card', async (test) => {
	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'user-admin')
	test.truthy(card)
})

ava('.getCardById() should find an active card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.getCardById() should find an active card by its id and type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id, {
		type: 'card'
	})

	test.deepEqual(card, result)
})

ava('.getCardById() should not find an active card by its id but an invalid type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id, {
		type: 'session'
	})

	test.deepEqual(card, null)
})

ava('.getCardBySlug() should find an active card by its slug', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar')
	test.deepEqual(card, result)
})

ava('.getCardBySlug() should find an active card by its slug and its type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar', {
		type: 'card'
	})

	test.deepEqual(card, result)
})

ava('.getCardBySlug() should not find an active card by its slug but an invalid type', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar', {
		type: 'session'
	})

	test.deepEqual(card, null)
})

ava('.getCardById() should return an inactive card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo-bar',
		type: 'card',
		version: '1.0.0',
		data: {}
	}))

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	}))

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result1, result2 ])
})

ava('.query() should be able to sort the results', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 2
		}
	}))

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 3
		}
	}))

	const result3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 1
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		$$sort: 'input.a.data.test < input.b.data.test',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	})

	test.deepEqual(results, [ result3, result1, result2 ])
})

ava('.query() should be able to skip the results', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	}))

	const result3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		skip: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result3 ])
})

ava('.query() should be able to limit and skip the results', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	}))

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 1,
		skip: 1
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result2 ])
})

ava('.query() should return the cards that match a schema', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johndoe',
		type: 'card',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io'
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johnsmith',
		type: 'card',
		version: '1.0.0',
		data: {
			email: 'johnsmith@example.io'
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: 'doe$'
			},
			type: {
				type: 'string'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				},
				required: [ 'email' ]
			}
		},
		required: [ 'id', 'slug', 'type', 'data' ]
	})

	test.deepEqual(results, [
		{
			id: result1.id,
			slug: 'johndoe',
			type: 'card',
			markers: [],
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava('.query() should take roles into account', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johndoe',
		type: 'card',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	}))

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						required: [ 'type', 'data' ],
						properties: {
							type: {
								type: 'string',
								const: 'type'
							},
							data: {
								type: 'object',
								required: [ 'schema' ],
								properties: {
									schema: {
										type: 'object',
										additionalProperties: true
									}
								}
							}
						}
					}
				}
			]
		}
	}))

	const results = await test.context.kernel.query(session.id, {
		type: 'object',
		required: [ 'type', 'slug', 'active', 'data' ],
		properties: {
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: '^user'
			},
			active: {
				type: 'boolean'
			},
			data: {
				type: 'object'
			}
		}
	})

	test.deepEqual(results, [
		_.pick(CARDS.user, [ 'type', 'slug', 'active', 'data', 'markers' ])
	])
})

ava('.query() should ignore queries to properties not whitelisted by a role', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johndoe',
		type: 'card',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	}))

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						additionalProperties: false,
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'type'
							}
						}
					}
				}
			]
		}
	}))

	const results = await test.context.kernel.query(session.id, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: '^user'
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'type',
			slug: 'user'
		}
	])
})

ava('.query() should ignore queries to disallowed properties with additionalProperties: true', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johndoe',
		type: 'card',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	}))

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'view-read-foo',
		type: 'view',
		version: '1.0.0',
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						additionalProperties: false,
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'type'
							}
						}
					}
				}
			]
		}
	}))

	const results = await test.context.kernel.query(session.id, {
		type: 'object',
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: '^user'
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'type',
			slug: 'user'
		}
	])
})

ava('.query() should query all cards of a certain type', async (test) => {
	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user'
			}
		},
		required: [ 'slug', 'type' ]
	})

	test.deepEqual(_.sortBy(_.map(results, 'slug')), [ 'user-admin' ])
})

ava('.query() should return all action request cards', async (test) => {
	const request = test.context.kernel.defaults({
		type: 'action-request',
		slug: test.context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			action: 'action-foo',
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			timestamp: '2018-03-14T21:10:45.921Z',
			executed: false,
			arguments: {
				foo: 'bar'
			}
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, request)

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'action-request'
			},
			data: {
				type: 'object',
				required: [ 'action', 'actor', 'target', 'timestamp', 'executed' ],
				properties: {
					action: {
						type: 'string'
					},
					actor: {
						type: 'string'
					},
					target: {
						type: 'string'
					},
					timestamp: {
						type: 'string'
					},
					executed: {
						type: 'boolean'
					},
					arguments: {
						type: 'object',
						additionalProperties: true
					}
				}
			}
		},
		required: [ 'type', 'data' ]
	})

	test.deepEqual(results, [
		{
			type: 'action-request',
			markers: [],
			data: {
				action: 'action-foo',
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				timestamp: '2018-03-14T21:10:45.921Z',
				executed: false,
				arguments: {
					foo: 'bar'
				}
			}
		}
	])
})

ava('.query() should be able to return both action requests and other cards', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		type: 'action-request',
		slug: test.context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			action: 'action-foo',
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			timestamp: '2018-03-14T21:10:45.921Z',
			executed: false,
			arguments: {
				foo: 'bar'
			}
		}
	}))

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			executed: false
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			data: {
				type: 'object',
				properties: {
					executed: {
						type: 'boolean',
						const: false
					}
				},
				required: [ 'executed' ]
			}
		},
		required: [ 'id', 'data' ]
	})

	test.deepEqual(_.orderBy(_.map(results, 'id')), _.orderBy([ result1.id, result2.id ]))
})

ava('.query() should return inactive cards', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'johnsmith',
		type: 'card',
		version: '1.0.0',
		active: false,
		data: {
			email: 'johnsmith@example.io',
			roles: []
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: 'smith$'
			}
		},
		required: [ 'slug' ]
	})

	test.deepEqual(results, [
		{
			markers: [],
			slug: 'johnsmith'
		}
	])
})

ava('.query() should take a view card with two filters', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		tags: [ 'foo' ],
		data: {
			number: 1
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			number: 1
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		slug: 'view-myview',
		type: 'view',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
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

	test.deepEqual(results, [
		{
			tags: [ 'foo' ],
			markers: [],
			data: {
				number: 1
			}
		}
	])
})

ava('.query() should not consider active links to inactive cards', async (test) => {
	const parent1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		active: false,
		data: {
			thread: true,
			number: 1
		}
	}))

	const parent2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 2
		}
	}))

	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 1
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${parent1.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: parent1.id
		}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'qux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 2
		}
	}))

	const link2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card2.slug}-is-attached-to-${parent2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: parent2.id
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$sort: 'input.a.data.count < input.b.data.count',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					data: {
						type: 'object',
						required: [ 'thread' ],
						properties: {
							thread: {
								type: 'boolean',
								const: true
							}
						}
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			links: {
				type: 'object',
				additionalProperties: true
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
	})

	test.deepEqual(results, [
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent2.id,
						$link: link2.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2
			}
		}
	])
})

ava('.query() should not consider inactive links', async (test) => {
	const parent1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 1
		}
	}))

	const parent2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 2
		}
	}))

	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 1
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${parent1.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		active: false,
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: parent1.id
		}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'qux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 2
		}
	}))

	const link2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card2.slug}-is-attached-to-${parent2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: parent2.id
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$sort: 'input.a.data.count < input.b.data.count',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					data: {
						type: 'object',
						required: [ 'thread' ],
						properties: {
							thread: {
								type: 'boolean',
								const: true
							}
						}
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			links: {
				type: 'object',
				additionalProperties: true
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
	})

	test.deepEqual(results, [
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent2.id,
						$link: link2.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2
			}
		}
	])
})

ava('.query() should be able to query using links', async (test) => {
	const parent1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 1
		}
	}))

	const parent2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 2
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 3
		}
	}))

	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'qux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 1
		}
	}))

	const link1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card1.slug}-is-attached-to-${parent1.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: parent1.id
		}
	}))

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'tux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 2
		}
	}))

	const link2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card2.slug}-is-attached-to-${parent1.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: parent1.id
		}
	}))

	const card3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'fux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			count: 3
		}
	}))

	const link3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: `link-${card3.slug}-is-attached-to-${parent2.slug}`,
		type: 'link',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card3.id,
			to: parent2.id
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$sort: 'input.a.data.count < input.b.data.count',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					data: {
						type: 'object',
						required: [ 'thread' ],
						properties: {
							thread: {
								type: 'boolean',
								const: true
							}
						}
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			links: {
				type: 'object',
				additionalProperties: true
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
	})

	test.deepEqual(results, [
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent1.id,
						$link: link1.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 1
			}
		},
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent1.id,
						$link: link2.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2
			}
		},
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent2.id,
						$link: link3.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 3
			}
		}
	])
})

ava('.query() should be able to query using links using the target property', async (test) => {
	const parent1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'parent1',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 1
		}
	}))

	const parent2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'parent2',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 2
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: true,
			number: 3
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'bar',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			target: parent1.id,
			count: 1
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'baz',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			target: parent1.id,
			count: 2
		}
	}))

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
		slug: 'qux',
		type: 'card',
		version: '1.0.0',
		data: {
			thread: false,
			target: parent2.id,
			count: 3
		}
	}))

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$sort: 'input.a.data.count < input.b.data.count',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'data' ],
				properties: {
					id: {
						type: 'string'
					},
					data: {
						type: 'object',
						required: [ 'thread' ],
						properties: {
							thread: {
								type: 'boolean',
								const: true
							}
						}
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			links: {
				type: 'object',
				additionalProperties: true
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
	})

	test.deepEqual(results, [
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent1.id,
						$link: results[0].links['is attached to'][0].$link,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 1
			}
		},
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent1.id,
						$link: results[1].links['is attached to'][0].$link,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2
			}
		},
		{
			type: 'card',
			markers: [],
			links: {
				'is attached to': [
					{
						id: parent2.id,
						$link: results[2].links['is attached to'][0].$link,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 3
			}
		}
	])
})

ava.cb('.stream() should report back new elements that match a certain slug', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: 'card-foo'
			},
			active: {
				type: 'boolean'
			},
			links: {
				type: 'object'
			},
			tags: {
				type: 'array'
			},
			data: {
				type: 'object',
				properties: {
					test: {
						type: 'number'
					}
				}
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'card',
				slug: 'card-foo',
				active: true,
				links: {},
				tags: [],
				markers: [],
				data: {
					test: 1
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				slug: 'card-foo',
				type: 'card',
				version: '1.0.0',
				data: {
					test: 1
				}
			})),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				slug: 'card-bar',
				type: 'card',
				version: '1.0.0',
				data: {
					test: 2
				}
			}))
		])
	}).catch(test.end)
})

ava.cb('.stream() should report back elements of a certain type', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'card'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				},
				required: [ 'email' ]
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'johndoe',
				type: 'card',
				markers: [],
				data: {
					email: 'johndoe@example.com'
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				slug: 'card-foo',
				type: 'card',
				version: '1.0.0',
				data: {
					test: 1
				}
			})),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				slug: 'johndoe',
				type: 'card',
				version: '1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			}))
		])
	}).catch(test.end)
})

ava.cb('.stream() should report back action requests', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'action-request'
			},
			data: {
				type: 'object',
				properties: {
					action: {
						type: 'string'
					},
					actor: {
						type: 'string'
					},
					target: {
						type: 'string'
					},
					timestamp: {
						type: 'string'
					},
					executed: {
						type: 'boolean'
					},
					arguments: {
						type: 'object',
						additionalProperties: true
					}
				}
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'action-request',
				markers: [],
				data: {
					action: 'action-delete-card',
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					timestamp: '2018-03-16T03:29:29.543Z',
					executed: false,
					arguments: {}
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				type: 'action-request',
				slug: test.context.generateRandomSlug({
					prefix: 'action-request'
				}),
				version: '1.0.0',
				data: {
					action: 'action-delete-card',
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					timestamp: '2018-03-16T03:29:29.543Z',
					executed: false,
					arguments: {}
				}
			})),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
				slug: 'johndoe',
				type: 'card',
				version: '1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			}))
		])
	}).catch(test.end)
})

ava.cb('.stream() should close without finding anything', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'foobarbazqux'
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.close()
		emitter.on('error', test.end)
		emitter.on('closed', test.end)
	}).catch(test.end)
})

ava.cb('.stream() should report back inactive elements', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'card',
				markers: [],
				slug: 'card-bar'
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
			slug: 'card-bar',
			active: false,
			type: 'card',
			version: '1.0.0',
			data: {
				test: 2
			}
		}))
	}).catch(test.end)
})
