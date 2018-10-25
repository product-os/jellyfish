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
const helpers = require('./helpers')

ava.test.beforeEach(helpers.sdk.beforeEach)
ava.test.afterEach(helpers.sdk.afterEach)

ava.test.serial('.action() should be able to successfully create a new card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const name = `test-card-${randomstring.generate()}`

	await sdk.action({
		card: 'card',
		action: 'action-create-card',
		arguments: {
			properties: {
				version: '1.0.0',
				name
			}
		}
	})

	const results = await test.context.server.jellyfish.query(
		test.context.session,
		{
			type: 'object',
			properties: {
				name: {
					type: 'string',
					const: name
				},
				type: {
					type: 'string'
				}
			},
			required: [ 'name' ]
		}
	)

	test.deepEqual(results, [
		{
			type: 'card',
			name
		}
	])
})

ava.test.serial('.action() should resolve with the created card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const name = `test-card-${randomstring.generate()}`

	const card = await sdk.action({
		card: 'card',
		action: 'action-create-card',
		arguments: {
			properties: {
				version: '1.0.0',
				name
			}
		}
	})

	test.deepEqual(_.omit(card, 'id'), {
		name,
		version: '1.0.0',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})
})

ava.test.serial('.query() should run a query on the server', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${randomstring.generate()}`

	await server.jellyfish.insertCard(test.context.session, {
		name,
		version: '1.0.0',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})

	await sdk.setAuthToken(test.context.session)

	const result = await sdk.query({
		type: 'object',
		properties: {
			name: {
				type: 'string',
				const: name
			}
		},
		additionalProperties: true
	})

	test.deepEqual(_.omit(_.first(result), 'id'), {
		name,
		version: '1.0.0',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})
})

ava.test.serial('.query() should accept a "limit" option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const limit = 2

	const baseTime = 1539092025937
	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 1000).toISOString(),
			uuid
		},
		name: 'card1',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 2000).toISOString(),
			uuid
		},
		name: 'card2',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 3000).toISOString(),
			uuid
		},
		name: 'card3',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			data: {
				type: 'object',
				required: [ 'uuid' ],
				additionalProperties: true,
				properties: {
					uuid: {
						type: 'string',
						const: uuid
					}
				}
			}
		},
		additionalProperties: true
	}, {
		limit
	})

	test.deepEqual(results, [ card1, card2 ])
})

ava.test.serial('.query() should accept a "skip" option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const limit = 2
	const skip = 1

	const baseTime = 1539092025937
	const uuid = randomstring.generate()

	await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 1000).toISOString(),
			uuid
		},
		name: 'card1',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 2000).toISOString(),
			uuid
		},
		name: 'card2',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card3 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			timestamp: new Date(baseTime + 3000).toISOString(),
			uuid
		},
		name: 'card3',
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			data: {
				type: 'object',
				required: [ 'uuid' ],
				additionalProperties: true,
				properties: {
					uuid: {
						type: 'string',
						const: uuid
					}
				}
			}
		},
		additionalProperties: true
	}, {
		limit,
		skip
	})

	test.deepEqual(results, [ card2, card3 ])
})

ava.test.serial('.query() should accept a "sortBy" option as a single key', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		name: 'd',
		data: {
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		name: 'a',
		data: {
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card3 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		name: 'c',
		data: {
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card4 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		name: 'b',
		data: {
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			data: {
				type: 'object',
				required: [ 'uuid' ],
				additionalProperties: true,
				properties: {
					uuid: {
						type: 'string',
						const: uuid
					}
				}
			}
		},
		additionalProperties: true
	}, {
		sortBy: 'name'
	})

	test.deepEqual(results, [ card2, card4, card3, card1 ])
})

ava.test.serial('.query() should accept a "sortBy" option as an array of keys', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			code: 'd',
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			code: 'a',
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card3 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			code: 'c',
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	const card4 = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		data: {
			code: 'b',
			uuid
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		required: [ 'type', 'data' ],
		properties: {
			type: {
				type: 'string',
				const: 'card'
			},
			data: {
				type: 'object',
				required: [ 'uuid' ],
				additionalProperties: true,
				properties: {
					uuid: {
						type: 'string',
						const: uuid
					}
				}
			}
		},
		additionalProperties: true
	}, {
		sortBy: [ 'data', 'code' ]
	})

	test.deepEqual(results, [ card2, card4, card3, card1 ])
})

ava.test.serial('.card.get() should return a single element', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${randomstring.generate()}`

	let cardsToInsert = 5

	while (cardsToInsert--) {
		await server.jellyfish.insertCard(test.context.session, {
			version: '1.0.0',
			type: 'card',
			active: true,
			links: {},
			requires: [],
			capabilities: [],
			markers: [],
			tags: [],
			data: {}
		})
	}

	const card = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		name,
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})

	await sdk.setAuthToken(test.context.session)

	const result = await sdk.card.get(card.id)

	test.deepEqual(result, card)
})

ava.test.serial('.card.get() should work with slugs', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const slug = `test-card-${randomstring.generate().toLowerCase()}`

	let cardsToInsert = 5

	while (cardsToInsert--) {
		await server.jellyfish.insertCard(test.context.session, {
			version: '1.0.0',
			type: 'card',
			active: true,
			links: {},
			requires: [],
			capabilities: [],
			markers: [],
			tags: [],
			data: {}
		})
	}

	const card = await server.jellyfish.insertCard(test.context.session, {
		version: '1.0.0',
		slug,
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})

	await sdk.setAuthToken(test.context.session)

	const result = await sdk.card.get(slug)

	test.deepEqual(result, card)
})

ava.test.serial('.card.create() should create a new card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const slug = `test-card-${randomstring.generate().toLowerCase()}`

	await sdk.card.create({
		type: 'card',
		version: '1.0.0',
		slug
	})

	const results = await test.context.server.jellyfish.query(
		test.context.session,
		{
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string'
				}
			},
			required: [ 'slug', 'type' ]
		}
	)

	test.deepEqual(_.first(results), {
		type: 'card',
		slug
	})
})

ava.test.serial('.card.create() should resolve with the created card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const slug = `test-card-${randomstring.generate().toLowerCase()}`

	const card = await sdk.card.create({
		type: 'card',
		version: '1.0.0',
		slug
	})

	test.deepEqual(_.omit(card, 'id'), {
		version: '1.0.0',
		slug,
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: [],
		data: {}
	})
})

ava.test.serial('.card.remove() should be able to delete a card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const card = await sdk.card.create({
		type: 'card',
		version: '1.0.0'
	})

	await sdk.card.remove(card.id)
	const result = await sdk.card.get(card.id)
	test.false(result.active)
})
