/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')

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

	sdk.setAuthToken(test.context.session)

	const name = `test-card-${uuid()}`

	await sdk.action({
		card: 'card',
		type: 'type',
		action: 'action-create-card',
		arguments: {
			reason: null,
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

ava.serial('.action() should resolve with the slug, id and type of the card', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)

	const name = `test-card-${uuid()}`
	const slug = test.context.generateRandomSlug({
		prefix: 'card'
	})

	const card = await sdk.action({
		card: 'card',
		type: 'type',
		action: 'action-create-card',
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				name
			}
		}
	})

	test.deepEqual(card, {
		id: card.id,
		slug,
		type: 'card'
	})
})

ava.serial('.query() should run a query on the server', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${uuid()}`
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

	sdk.setAuthToken(test.context.session)

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
		required: [ 'name', 'type' ],
		additionalProperties: true
	})

	test.deepEqual(results[0], {
		id: results[0].id,
		created_at: results[0].created_at,
		updated_at: null,
		linked_at: {},
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
	const id = uuid()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
		data: {
			timestamp: new Date(baseTime + 1000).toISOString(),
			uuid: id
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
			uuid: id
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
			uuid: id
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

	sdk.setAuthToken(test.context.session)

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
						const: id
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
	const id = uuid()

	await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
		data: {
			timestamp: new Date(baseTime + 1000).toISOString(),
			uuid: id
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
			uuid: id
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
			uuid: id
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

	sdk.setAuthToken(test.context.session)

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
						const: id
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

	const id = uuid()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
		name: 'd',
		data: {
			uuid: id
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
			uuid: id
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
			uuid: id
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
			uuid: id
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	sdk.setAuthToken(test.context.session)

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
						const: id
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

	const id = uuid()

	const card1 = await server.jellyfish.insertCard(test.context.context, test.context.session, {
		version: '1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'card'
		}),
		data: {
			code: 'd',
			uuid: id
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
			uuid: id
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
			uuid: id
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
			uuid: id
		},
		type: 'card',
		active: true,
		links: {},
		requires: [],
		capabilities: [],
		markers: [],
		tags: []
	})

	sdk.setAuthToken(test.context.session)

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
						const: id
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

	const name = `test-card-${uuid()}`

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

	sdk.setAuthToken(test.context.session)

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

	sdk.setAuthToken(test.context.session)

	const result = await sdk.card.get(slug, {
		type: 'card'
	})

	test.deepEqual(result, card)
})

ava.serial('.card.get() should work for ids without a type option', async (test) => {
	const {
		sdk,
		server
	} = test.context

	const name = `test-card-${uuid()}`

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

	sdk.setAuthToken(test.context.session)

	const result = await sdk.card.get(card.id)

	test.deepEqual(result, card)
})

ava.serial('.card.get() should work for slugs without a type option', async (test) => {
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

	sdk.setAuthToken(test.context.session)

	const result = await sdk.card.get(slug)

	test.deepEqual(result, card)
})

ava.serial('.card.create() should create a new card', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)

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

ava.serial('.card.create() should resolve with the slug, id and type of the created card', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)

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
		slug,
		type: 'card'
	})
})

ava.serial('.card.remove() should be able to delete a card', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)

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

	sdk.setAuthToken(test.context.session)

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
			message: 'Foo',
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
			message: 'Foo',
			test: 1
		}
	})
})

ava.serial.cb('.stream() should stream new cards', (test) => {
	const {
		sdk,
		server
	} = test.context

	const slug1 = `test-card-${uuid()}`.toLowerCase()
	const slug2 = `test-card-${uuid()}`.toLowerCase()

	sdk.setAuthToken(test.context.session)
	sdk.stream({
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: slug1
			},
			data: {
				type: 'object',
				required: [ 'test' ],
				properties: {
					test: {
						type: 'number'
					}
				}
			}
		},
		required: [ 'type' ]
	})
		.then(async (stream) => {
			stream.on('error', test.end)
			stream.on('disconnect', () => {
				test.end()
			})

			stream.on('update', (update) => {
				test.is(update.data.type, 'insert')
				test.is(update.data.before, null)
				test.deepEqual(_.omit(update.data.after, [ 'id' ]), {
					slug: slug1,
					data: {
						test: 1
					}
				})

				stream.close()
			})

			try {
				await Bluebird.all([
					server.jellyfish.insertCard(test.context.context, test.context.session, {
						type: 'card',
						slug: slug1,
						data: {
							test: 1
						}
					}),
					server.jellyfish.insertCard(test.context.context, test.context.session, {
						type: 'card',
						slug: slug2,
						data: {
							test: 3
						}
					})
				])
			} catch (error) {
				throw error
			}
		})
})

ava.serial.cb('.stream() should emit an event using the .type() method', (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)
	sdk.stream()
		.then(async (stream1) => {
			const stream2 = await sdk.stream()

			stream1.on('error', test.end)
			stream2.on('error', test.end)

			stream2.on('disconnect', () => {
				test.end()
			})

			const user = 'user-foo'
			const card = '26585e96-af18-4519-a45d-8016e987ef06'

			stream1.on('typing', (payload) => {
				test.is(payload.user, user)
				test.is(payload.card, card)

				stream1.close()
				stream2.close()
			})

			stream2.type(user, card)
		})
})

ava.serial('.auth.signup() should fail with an invalid token', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(uuid())

	const details = {
		username: `testuser-${uuid()}`,
		email: `testuser-${uuid()}@example.com`,
		password: 'password'
	}

	const error = await test.throwsAsync(sdk.auth.signup(details))

	test.is(error.name, 'JellyfishInvalidSession')
})

ava.serial('.auth.signup() should work with a valid token', async (test) => {
	const {
		sdk
	} = test.context

	sdk.setAuthToken(test.context.session)

	const details = {
		username: `testuser-${uuid()}`,
		email: `testuser-${uuid()}@example.com`,
		password: 'password'
	}

	const user = await sdk.auth.signup(details)

	const card = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, user.id, {
			type: 'user'
		})

	test.deepEqual(card, test.context.jellyfish.defaults({
		created_at: card.created_at,
		linked_at: card.linked_at,
		type: 'user',
		slug: `user-${details.username}`,
		id: card.id,
		name: null,
		data: {
			email: details.email,
			roles: [ 'user-community' ],
			hash: card.data.hash
		}
	}))
})

ava.serial('.auth.loginWithToken() should work with a valid token', async (test) => {
	const {
		sdk
	} = test.context

	await test.notThrowsAsync(sdk.auth.loginWithToken(test.context.session))
})

ava.serial('.auth.loginWithToken() should throw with an invalid token', async (test) => {
	const {
		sdk
	} = test.context

	const error = await test.throwsAsync(sdk.auth.loginWithToken('foobarbazbuzz'))

	test.is(error.message, 'Token is invalid: foobarbazbuzz')
})

ava.serial('.auth.loginWithToken() should refresh your session token', async (test) => {
	const {
		sdk
	} = test.context

	const newToken = await sdk.auth.loginWithToken(test.context.session)

	test.not(newToken, test.context.session)

	test.is(newToken, sdk.getAuthToken())

	await test.notThrowsAsync(sdk.auth.whoami())
})

ava.serial('.auth.refreshToken() should not throw if called multiple times in a row', async (test) => {
	test.context.sdk.setAuthToken(test.context.session)

	await test.notThrowsAsync(async () => {
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
		await test.context.sdk.auth.refreshToken()
	})
})

ava.serial('should broadcast github issue links', async (test) => {
	test.context.sdk.setAuthToken(test.context.session)

	const issueSlug = test.context.generateRandomSlug({
		prefix: 'issue'
	})

	const threadSlug = test.context.generateRandomSlug({
		prefix: 'thread'
	})

	const issue = await test.context.sdk.card.create({
		type: 'issue',
		version: '1.0.0',
		slug: issueSlug,
		name: 'Test Issue',
		data: {
			repository: environment.test.integration.github.repo,
			description: 'Foo Bar',
			tags: [],
			status: 'open',
			archived: false
		}
	})

	const thread = await test.context.sdk.card.create({
		type: 'support-thread',
		version: '1.0.0',
		slug: threadSlug,
		name: 'Test Thread',
		data: {
			category: 'general',
			environment: 'production',
			description: 'Foo Bar',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	test.truthy(issue)
	test.truthy(thread)

	await test.context.sdk.card.link(thread, issue, 'support thread is attached to issue')

	const fullCard = await test.context.sdk.card.getWithTimeline(issue.id, {
		type: issue.type
	})

	const broadcast = _.find(fullCard.links['has attached element'], {
		type: 'message'
	})

	test.truthy(broadcast)
	test.is(broadcast.data.payload.message,
		`This issue has attached support thread https://jel.ly.fish/#/support-thread~${thread.id}`)
})

ava.serial('should link two cards together', async (test) => {
	test.context.sdk.setAuthToken(test.context.session)

	const issueSlug = test.context.generateRandomSlug({
		prefix: 'issue'
	})

	const threadSlug = test.context.generateRandomSlug({
		prefix: 'thread'
	})

	const issue = await test.context.sdk.card.create({
		type: 'issue',
		version: '1.0.0',
		slug: issueSlug,
		name: 'Test Issue',
		data: {
			repository: environment.test.integration.github.repo,
			description: 'Foo Bar',
			tags: [],
			status: 'open',
			archived: false
		}
	})

	const thread = await test.context.sdk.card.create({
		type: 'support-thread',
		version: '1.0.0',
		slug: threadSlug,
		name: 'Test Thread',
		data: {
			category: 'general',
			environment: 'production',
			description: 'Foo Bar',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	test.truthy(issue)
	test.truthy(thread)

	await test.context.sdk.card.link(issue, thread,
		'issue has attached support thread')

	const expandedIssue = _.first(await test.context.sdk.query({
		type: 'object',
		required: [ 'id', 'links' ],
		additionalProperties: true,
		$$links: {
			'issue has attached support thread': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			id: {
				type: 'string',
				const: issue.id
			},
			links: {
				type: 'object'
			}
		}
	}))

	const expandedThread = _.first(await test.context.sdk.query({
		type: 'object',
		required: [ 'id', 'links' ],
		additionalProperties: true,
		$$links: {
			'support thread is attached to issue': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			id: {
				type: 'string',
				const: thread.id
			},
			links: {
				type: 'object'
			}
		}
	}))

	test.deepEqual(thread, _.pick(_.find(expandedIssue.links['issue has attached support thread'], {
		id: thread.id
	}), [ 'id', 'type', 'slug' ]))

	test.deepEqual(issue, _.pick(_.find(expandedThread.links['support thread is attached to issue'], {
		id: issue.id
	}), [ 'id', 'type', 'slug' ]))
})

ava.serial('linking two cards should be idempotent', async (test) => {
	test.context.sdk.setAuthToken(test.context.session)

	const issueSlug = test.context.generateRandomSlug({
		prefix: 'issue'
	})

	const threadSlug = test.context.generateRandomSlug({
		prefix: 'thread'
	})

	const issue = await test.context.sdk.card.create({
		type: 'issue',
		version: '1.0.0',
		slug: issueSlug,
		name: 'Test Issue',
		data: {
			repository: environment.test.integration.github.repo,
			description: 'Foo Bar',
			tags: [],
			status: 'open',
			archived: false
		}
	})

	const thread = await test.context.sdk.card.create({
		type: 'support-thread',
		version: '1.0.0',
		slug: threadSlug,
		name: 'Test Thread',
		data: {
			category: 'general',
			environment: 'production',
			description: 'Foo Bar',
			inbox: 'S/Paid_Support',
			status: 'open'
		}
	})

	test.truthy(issue)
	test.truthy(thread)

	await test.context.sdk.card.link(issue, thread,
		'issue has attached support thread')
	await test.context.sdk.card.link(issue, thread,
		'issue has attached support thread')
	await test.context.sdk.card.link(issue, thread,
		'issue has attached support thread')
	await test.context.sdk.card.link(issue, thread,
		'issue has attached support thread')

	const expandedIssue = _.first(await test.context.sdk.query({
		type: 'object',
		required: [ 'id', 'links' ],
		additionalProperties: true,
		$$links: {
			'issue has attached support thread': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			id: {
				type: 'string',
				const: issue.id
			},
			links: {
				type: 'object'
			}
		}
	}))

	const expandedThread = _.first(await test.context.sdk.query({
		type: 'object',
		required: [ 'id', 'links' ],
		additionalProperties: true,
		$$links: {
			'support thread is attached to issue': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			id: {
				type: 'string',
				const: thread.id
			},
			links: {
				type: 'object'
			}
		}
	}))

	test.deepEqual(thread, _.pick(_.find(expandedIssue.links['issue has attached support thread'], {
		id: thread.id
	}), [ 'id', 'type', 'slug' ]))

	test.deepEqual(issue, _.pick(_.find(expandedThread.links['support thread is attached to issue'], {
		id: issue.id
	}), [ 'id', 'type', 'slug' ]))
})
