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

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

ava.serial('.action() should be able to successfully create a new card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const name = `test-card-${randomstring.generate()}`

	await sdk.action({
		card: 'card',
		type: 'type',
		action: 'action-create-card',
		arguments: {
			properties: {
				slug: test.context.generateRandomSlug({
					prefix: 'card'
				}),
				version: '1.0.0',
				name
			}
		}
	})

	const results = await test.context.jellyfish.query(test.context.context,
		test.context.session,
		{
			type: 'object',
			properties: {
				name: {
					type: 'string',
					const: name
				},
				type: {
					type: 'string',
					const: 'card'
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

ava.serial('.action() should resolve with the created card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const name = `test-card-${randomstring.generate()}`
	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	const card = await sdk.action({
		card: 'card',
		type: 'type',
		action: 'action-create-card',
		arguments: {
			properties: {
				slug,
				version: '1.0.0',
				name
			}
		}
	})

	test.deepEqual(card, {
		created_at: card.created_at,
		id: card.id,
		name,
		slug,
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

ava.serial('.query() should run a query on the server', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${randomstring.generate()}`
	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	await server.jellyfish.insertCard(test.context.context, test.context.session, {
		name,
		slug,
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

	const results = await sdk.query({
		type: 'object',
		properties: {
			name: {
				type: 'string',
				const: name
			},
			type: {
				type: 'string',
				const: 'card'
			}
		},
		additionalProperties: true
	})

	test.deepEqual(results[0], {
		id: results[0].id,
		created_at: results[0].created_at,
		name,
		slug,
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

ava.serial('.query() should accept a "limit" option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const limit = 2

	const baseTime = 1539092025937
	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card2 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

ava.serial('.query() should accept a "skip" option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const limit = 2
	const skip = 1

	const baseTime = 1539092025937
	const uuid = randomstring.generate()

	await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card2 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card3 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

ava.serial('.query() should accept a "sortBy" option as a single key', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card2 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card3 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card4 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

ava.serial('.query() should accept a "sortBy" option as an array of keys', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const uuid = randomstring.generate()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card2 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card3 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const card4 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

ava.serial('.card.get() should return a single element', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${randomstring.generate()}`

	let cardsToInsert = 5

	while (cardsToInsert--) {
		await server.jellyfish.insertCard(test.context.context, test.context.session, {
			version: '1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'card'
			}),
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

	const card = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		name,
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
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

	const result = await sdk.card.get(card.id, {
		type: 'card'
	})

	test.deepEqual(result, card)
})

ava.serial('.card.get() should work with slugs', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	let cardsToInsert = 5

	while (cardsToInsert--) {
		await server.jellyfish.insertCard(test.context.context, test.context.session, {
			version: '1.0.0',
			slug: test.context.generateRandomSlug({
				prefix: 'card'
			}),
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

	const card = await server.jellyfish.insertCard(test.context.context, test.context.session, {
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

	const result = await sdk.card.get(slug, {
		type: 'card'
	})

	test.deepEqual(result, card)
})

ava.serial('.card.create() should create a new card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	await sdk.card.create({
		type: 'card',
		version: '1.0.0',
		slug
	})

	const results = await test.context.jellyfish.query(test.context.context,
		test.context.session,
		{
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string',
					const: 'card'
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

ava.serial('.card.create() should resolve with the created card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	const card = await sdk.card.create({
		type: 'card',
		version: '1.0.0',
		slug
	})

	test.deepEqual(card, {
		id: card.id,
		created_at: card.created_at,
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

ava.serial('.card.remove() should be able to delete a card', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const card = await sdk.card.create({
		type: 'card',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
		version: '1.0.0'
	})

	await sdk.card.remove(card.id, card.type)
	const result = await sdk.card.get(card.id, {
		type: 'card'
	})
	test.false(result.active)
})

ava.serial('.event.create() should create a new event', async (test) => {
	const {
		sdk
	} = test.context

	await sdk.setAuthToken(test.context.session)

	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	const card = await sdk.card.create({
		type: 'card',
		version: '1.0.0',
		slug
	})

	const event = {
		target: card,
		type: 'message',
		payload: {
			test: 1
		}
	}

	await sdk.event.create(event)

	const results = await test.context.server.jellyfish.query(test.context.context,
		test.context.session,
		{
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						target: {
							type: 'string',
							const: card.id
						},
						payload: {
							type: 'object',
							properties: {
								test: {
									type: 'number'
								}
							},
							required: [ 'test' ]
						}
					},
					required: [ 'target', 'payload' ],
					additionalProperties: false
				},
				type: {
					type: 'string',
					const: 'message'
				}
			},
			additionalProperties: false
		}
	)

	const result = _.first(results)

	test.is(result.type, 'message')

	test.deepEqual(result.data, {
		target: card.id,
		payload: {
			test: 1
		}
	})
})
