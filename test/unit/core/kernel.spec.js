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

ava.test.beforeEach(helpers.kernel.beforeEach)
ava.test.afterEach(helpers.kernel.afterEach)

for (const card of _.values(CARDS)) {
	ava.test(`should contain the ${card.slug} card by default`, async (test) => {
		const element = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, card.slug)
		test.deepEqual(CARDS[card.slug], _.omit(element, [ 'id' ]))
	})
}

ava.test('should be able to disconnect the kernel multiple times without errors', async (test) => {
	test.notThrows(async () => {
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
	})
})

ava.test('.insertCard() should throw an error if the element is not a valid card', async (test) => {
	await test.throws(test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		hello: 'world'
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
	await test.throws(test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'action-foo-bar',
		type: 'action',
		active: true,
		links: {},
		tags: [],
		data: {}
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throws(test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'foobarbazqux',
		active: true,
		links: {},
		tags: [],
		data: {}
	}), errors.JellyfishUnknownCardType)
})

ava.test('.insertCard() should be able to insert a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava.test('.insertCard() should throw if the card already exists', async (test) => {
	const card = {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	}

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, card)
	await test.throws(test.context.kernel.insertCard(
		test.context.kernel.sessions.admin,
		card
	), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertCard() should replace an element given override is true', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	}, {
		override: true
	})

	test.is(card1.id, card2.id)
	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, card1.id)
	test.deepEqual(element, card2)
})

ava.test('.insertCard() should be able to create a link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'link',
		name: 'is attached to',
		active: true,
		links: {},
		tags: [],
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
})

ava.test('.insertCard() should be able to create a direction-less link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const linkCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'link',
		name: 'is linked to',
		active: true,
		links: {},
		tags: [],
		data: {
			inverseName: 'is linked to',
			from: card1.id,
			to: card2.id
		}
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
	test.is(element.name, element.data.inverseName)
})

ava.test('.insertCard() should be able to create two different links between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const linkCard1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'link',
		name: 'is linked to',
		active: true,
		links: {},
		tags: [],
		data: {
			inverseName: 'has been linked to',
			from: card1.id,
			to: card2.id
		}
	})

	const linkCard2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'link',
		name: 'is attached to',
		active: true,
		links: {},
		tags: [],
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: card2.id
		}
	})

	test.is(linkCard1.data.from, linkCard2.data.from)
	test.is(linkCard1.data.to, linkCard2.data.to)
})

ava.test('.insertCard() should not add a link if not inserting a card with a target', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			foo: card1.id
		}
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

	test.deepEqual(results, [])
})

ava.test('.insertCard() should add a link if inserting a card with a target for the first time', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card1.id
		}
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
		{
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			name: 'is attached to',
			active: true,
			links: {},
			tags: [],
			data: {
				inverseName: 'has attached element',
				from: card2.id,
				to: card1.id
			}
		}
	])
})

ava.test('.insertCard() should not add the target link more than once if multiple equal insertions', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card1.id
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: card2.id,
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card1.id
		}
	}, {
		override: true
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: card2.id,
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card1.id
		}
	}, {
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
		{
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			name: 'is attached to',
			active: true,
			links: {},
			tags: [],
			data: {
				inverseName: 'has attached element',
				from: card2.id,
				to: card1.id
			}
		}
	])
})

ava.test('.insertCard() should update the link if the target changes', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card1.id
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: card3.id,
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			target: card2.id
		}
	}, {
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
		{
			id: results[0].id,
			slug: results[0].slug,
			type: 'link',
			name: 'is attached to',
			active: true,
			links: {},
			tags: [],
			data: {
				inverseName: 'has attached element',
				from: card3.id,
				to: card2.id
			}
		}
	])
})

ava.test('.insertCard() read access on a property should not allow to write other properties', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-user-johndoe',
		type: 'view',
		active: true,
		links: {},
		tags: [],
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
	})

	const userCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const targetUserCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-janedoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'janedoe@example.com',
			roles: []
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: {},
		tags: [],
		data: {
			actor: userCard.id
		}
	})

	await test.throws(test.context.kernel.insertCard(session.id, {
		id: targetUserCard.id,
		slug: 'user-janedoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'pwned@example.com',
			roles: []
		}
	}, {
		override: true
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should restrict the visibility of the user using write roles', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-user-johndoe',
		type: 'view',
		active: true,
		links: {},
		tags: [],
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
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-write-user-johndoe',
		type: 'view',
		active: true,
		links: {},
		tags: [],
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
	})

	const userCard = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: {},
		tags: [],
		data: {
			actor: userCard.id
		}
	})

	const readUserType = await test.context.kernel.getCardBySlug(session.id, 'user')
	test.is(readUserType.slug, 'user')

	const writeUserType = await test.context.kernel.getCardBySlug(session.id, 'user', {
		writeMode: true
	})

	test.deepEqual(writeUserType, null)

	await test.throws(test.context.kernel.insertCard(session.id, {
		slug: 'user-janedoe',
		type: 'user',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'janedoe@example.com',
			roles: []
		}
	}, {
		writeMode: true
	}), errors.JellyfishUnknownCardType)
})

ava.test('.getCardBySlug() there should be an admin card', async (test) => {
	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'user-admin')
	test.truthy(card)
})

ava.test('.getCardById() should find an active card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava.test('.getCardById() should find an active card by its id and type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id, {
		type: 'card'
	})

	test.deepEqual(card, result)
})

ava.test('.getCardById() should not find an active card by its id but an invalid type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id, {
		type: 'session'
	})

	test.deepEqual(card, null)
})

ava.test('.getCardBySlug() should find an active card by its slug', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar')
	test.deepEqual(card, result)
})

ava.test('.getCardBySlug() should find an active card by its slug and its type', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar', {
		type: 'card'
	})

	test.deepEqual(card, result)
})

ava.test('.getCardBySlug() should not find an active card by its slug but an invalid type', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar', {
		type: 'session'
	})

	test.deepEqual(card, null)
})

ava.test('.getCardById() should return an inactive card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: {},
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava.test('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

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

ava.test('.query() should be able to sort the results', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 2
		}
	})

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 3
		}
	})

	const result3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 1
		}
	})

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

ava.test('.query() should be able to skip the results', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	const result3 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

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

ava.test('.query() should be able to limit and skip the results', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

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

ava.test('.query() should return the cards that match a schema', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.io'
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johnsmith',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			email: 'johnsmith@example.io'
		}
	})

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
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava.test('.query() should take roles into account', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: {},
		tags: [],
		active: true,
		data: {
			actor: actor.id
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: {},
		tags: [],
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
	})

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
		_.pick(CARDS.user, [ 'type', 'slug', 'active', 'data' ])
	])
})

ava.test('.query() should ignore queries to properties not whitelisted by a role', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: {},
		tags: [],
		active: true,
		data: {
			actor: actor.id
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: {},
		tags: [],
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
	})

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

ava.test('.query() should ignore queries to disallowed properties with additionalProperties: true', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: {},
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: {},
		tags: [],
		active: true,
		data: {
			actor: actor.id
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: {},
		tags: [],
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
	})

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

ava.test('.query() should query all cards of a certain type', async (test) => {
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

ava.test('.query() should return all action request cards', async (test) => {
	const request = {
		type: 'action-request',
		active: true,
		links: {},
		tags: [],
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

ava.test('.query() should be able to return both action requests and other cards', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'action-request',
		active: true,
		links: {},
		tags: [],
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

	const result2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			executed: false
		}
	})

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

ava.test('.query() should return inactive cards', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johnsmith',
		type: 'card',
		active: false,
		links: {},
		tags: [],
		data: {
			email: 'johnsmith@example.io',
			roles: []
		}
	})

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
			slug: 'johnsmith'
		}
	])
})

ava.test('.query() should take a view card with two filters', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [ 'foo' ],
		links: {},
		active: true,
		data: {
			number: 1
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			number: 1
		}
	})

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
		type: 'view',
		tags: [],
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
			data: {
				number: 1
			}
		}
	])
})

ava.test('.query() should be able to query using links', async (test) => {
	const parent1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: true,
			number: 1
		}
	})

	const parent2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: true,
			number: 2
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: true,
			number: 3
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: false,
			target: parent1.id,
			count: 1
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: false,
			target: parent1.id,
			count: 2
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: {},
		active: true,
		data: {
			thread: false,
			target: parent2.id,
			count: 3
		}
	})

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
			links: {
				'is attached to': [
					{
						id: parent1.id,
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
			links: {
				'is attached to': [
					{
						id: parent1.id,
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
			links: {
				'is attached to': [
					{
						id: parent2.id,
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

ava.test.cb('.stream() should report back new elements that match a certain slug', (test) => {
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
				data: {
					test: 1
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'card-foo',
				links: {},
				tags: [],
				active: true,
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'card-bar',
				links: {},
				tags: [],
				active: true,
				type: 'card',
				data: {
					test: 2
				}
			})
		])
	}).catch(test.end)
})

ava.test.cb('.stream() should report back elements of a certain type', (test) => {
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
				data: {
					email: 'johndoe@example.com'
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'card-foo',
				links: {},
				tags: [],
				active: true,
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'johndoe',
				links: {},
				tags: [],
				active: true,
				type: 'card',
				data: {
					email: 'johndoe@example.com'
				}
			})
		])
	}).catch(test.end)
})

ava.test.cb('.stream() should report back action requests', (test) => {
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
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				type: 'action-request',
				links: {},
				tags: [],
				active: true,
				data: {
					action: 'action-delete-card',
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					timestamp: '2018-03-16T03:29:29.543Z',
					executed: false,
					arguments: {}
				}
			}),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'johndoe',
				links: {},
				tags: [],
				active: true,
				type: 'card',
				data: {
					email: 'johndoe@example.com'
				}
			})
		])
	}).catch(test.end)
})

ava.test.cb('.stream() should report both action requests and other types', (test) => {
	test.context.kernel.stream(test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				anyOf: [
					{
						const: 'action-request'
					},
					{
						const: 'card'
					}
				]
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		const changes = []

		emitter.on('data', (change) => {
			changes.push(change)

			if (changes.length === 2) {
				emitter.close()
			}
		})

		emitter.on('error', test.end)
		emitter.on('closed', () => {
			test.deepEqual(changes, [
				{
					before: null,
					after: {
						id: changes[0].after.id,
						type: 'action-request'
					}
				},
				{
					before: null,
					after: {
						id: changes[1].after.id,
						type: 'card'
					}
				}
			])

			test.end()
		})

		return test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
			type: 'action-request',
			links: {},
			tags: [],
			active: true,
			data: {
				action: 'action-delete-card',
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				timestamp: '2018-03-16T03:29:29.543Z',
				executed: false,
				arguments: {}
			}
		}).then(() => {
			return test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				type: 'card',
				links: {},
				tags: [],
				active: true,
				data: {
					test: 1
				}
			})
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should close without finding anything', (test) => {
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

ava.test.cb('.stream() should report back inactive elements', (test) => {
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
				slug: 'card-bar'
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
			slug: 'card-bar',
			links: {},
			tags: [],
			active: false,
			type: 'card',
			data: {
				test: 2
			}
		})
	}).catch(test.end)
})
