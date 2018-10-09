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

require('ts-node').register()

const ava = require('ava')
const _ = require('lodash')
const randomstring = require('randomstring')
const {
	getSdk
} = require('../../../lib/sdk')
const {
	createServer
} = require('../../../lib/server/create-server')

let port = 9800

ava.test.beforeEach(async (test) => {
	test.context.server = await createServer({
		port: port++,
		serverDatabase: `test_${randomstring.generate()}`
	})

	test.context.session = test.context.server.jellyfish.sessions.admin
	test.context.guestSession = test.context.server.jellyfish.sessions.guest

	// Since AVA tests are running concurrently, set up an SDK instance that will
	// communicate with whichever port this server instance bound to
	test.context.sdk = getSdk({
		apiPrefix: process.env.API_PREFIX || 'api/v2',
		apiUrl: `http://localhost:${test.context.server.port}`
	})
})

ava.test.afterEach(async (test) => {
	test.context.sdk.cancelAllStreams()
	test.context.sdk.cancelAllRequests()
	await test.context.server.close()
})

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
				name
			}
		}
	})

	test.deepEqual(_.omit(card, 'id'), {
		active: true,
		data: {},
		links: {},
		markers: [],
		name,
		tags: [],
		type: 'card'
	})
})

ava.test.serial('.query() should run a query on the server', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${randomstring.generate()}`

	await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {},
		links: {},
		markers: [],
		name,
		tags: [],
		type: 'card'
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
		active: true,
		data: {},
		links: {},
		markers: [],
		name,
		tags: [],
		type: 'card'
	})
})

ava.test.serial('.query() should accept a "limit" option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const limit = 2

	const baseTime = 1539092025937

	const card1 = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 1000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card1',
		tags: [],
		type: 'card'
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 2000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card2',
		tags: [],
		type: 'card'
	})

	await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 3000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card3',
		tags: [],
		type: 'card'
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'card'
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

	await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 1000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card1',
		tags: [],
		type: 'card'
	})

	const card2 = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 2000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card2',
		tags: [],
		type: 'card'
	})

	const card3 = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {
			timestamp: new Date(baseTime + 3000).toISOString()
		},
		links: {},
		markers: [],
		name: 'card3',
		tags: [],
		type: 'card'
	})

	await sdk.setAuthToken(test.context.session)

	const results = await sdk.query({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		additionalProperties: true
	}, {
		limit,
		skip
	})

	test.deepEqual(results, [ card2, card3 ])
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
			active: true,
			data: {},
			links: {},
			markers: [],
			tags: [],
			type: 'card'
		})
	}

	const card = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {},
		links: {},
		markers: [],
		name,
		tags: [],
		type: 'card'
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
			active: true,
			data: {},
			links: {},
			markers: [],
			tags: [],
			type: 'card'
		})
	}

	const card = await server.jellyfish.insertCard(test.context.session, {
		active: true,
		data: {},
		links: {},
		markers: [],
		slug,
		tags: [],
		type: 'card'
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
		slug
	})

	test.deepEqual(_.omit(card, 'id'), {
		active: true,
		data: {},
		links: {},
		markers: [],
		slug,
		tags: [],
		type: 'card'
	})
})
