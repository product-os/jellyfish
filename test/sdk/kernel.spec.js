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
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')
const errors = require('../../lib/sdk/errors')
const CARDS = require('../../lib/sdk/cards')

ava.test.beforeEach(async (test) => {
	test.context.backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await test.context.backend.connect()
	await test.context.backend.reset()

	test.context.buckets = {
		cards: 'cards',
		requests: 'requests',
		sessions: 'sessions'
	}

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: test.context.buckets
	})

	await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

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
		links: [],
		tags: [],
		data: {}
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throws(test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'foobarbazqux',
		active: true,
		links: [],
		tags: [],
		data: {}
	}), errors.JellyfishUnknownCardType)
})

ava.test('.insertCard() should be able to insert a card', async (test) => {
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id)

	test.deepEqual(element, {
		id,
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})
})

ava.test('.insertCard() should ignore the transient property', async (test) => {
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card',
		active: true,
		transient: {
			hello: 'world'
		},
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id)

	test.deepEqual(element, {
		id,
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})
})

ava.test('.insertCard() should ignore the transient property when upserting', async (test) => {
	const id1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})

	const id2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		id: id1,
		slug: 'hello-world',
		type: 'card',
		active: true,
		transient: {
			hello: 'world'
		},
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	}, {
		override: true
	})

	test.is(id1, id2)

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id1)

	test.deepEqual(element, {
		id: id1,
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})
})

ava.test('.insertCard() should provide sensible defaults', async (test) => {
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card'
	})

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id)

	test.deepEqual(element, {
		id,
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.insertCard() should throw if the card already exists', async (test) => {
	const card = {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
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
	const id1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const id2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	}, {
		override: true
	})

	test.is(id1, id2)

	const element = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id1)

	test.deepEqual(element, {
		id: id1,
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.insertCard() should insert action requests on a different bucket', async (test) => {
	const request = {
		type: 'action-request',
		active: true,
		links: [],
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

	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, request)
	test.deepEqual(await test.context.backend.getElementById(test.context.buckets.cards, id), null)
	test.deepEqual(await test.context.backend.getElementById(test.context.buckets.requests, id), Object.assign({
		id
	}, request))
})

ava.test('.insertCard() should restrict the visibility of the user using write roles', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-user-johndoe',
		type: 'view',
		active: true,
		links: [],
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
		links: [],
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

	const userId = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		active: true,
		links: [],
		tags: [],
		data: {
			actor: userId
		}
	})

	const readUserType = await test.context.kernel.getCardBySlug(session, 'user')
	test.is(readUserType.slug, 'user')

	const writeUserType = await test.context.kernel.getCardBySlug(session, 'user', {
		writeMode: true
	})

	test.deepEqual(writeUserType, null)

	await test.throws(test.context.kernel.insertCard(session, {
		slug: 'user-janedoe',
		type: 'user',
		active: true,
		links: [],
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
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id)

	test.deepEqual(card, {
		id,
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.getCardBySlug() should find an active card by its slug', async (test) => {
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardBySlug(test.context.kernel.sessions.admin, 'foo-bar')

	test.deepEqual(card, {
		id,
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.getCardById() should return an inactive card by its id', async (test) => {
	const id = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.kernel.sessions.admin, id)

	test.deepEqual(card, {
		id,
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})
})

ava.test('.query() should return the cards that match a schema', async (test) => {
	const id1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io'
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johnsmith',
		type: 'card',
		active: true,
		links: [],
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
			id: id1,
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
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: [],
		tags: [],
		data: {
			allOf: [
				{
					name: 'Types',
					schema: {
						type: 'object',
						properties: {
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
								}
							}
						}
					}
				}
			]
		}
	})

	const results = await test.context.kernel.query(session, {
		type: 'object',
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
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: [],
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

	const results = await test.context.kernel.query(session, {
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
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'session',
		links: [],
		tags: [],
		active: true,
		data: {
			actor
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'view-read-foo',
		type: 'view',
		active: false,
		links: [],
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

	const results = await test.context.kernel.query(session, {
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
		links: [],
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
						additionalProperties: true,
						type: 'object'
					}
				}
			}
		},
		required: [ 'type' ]
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
	const id1 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'action-request',
		active: true,
		links: [],
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

	const id2 = await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		active: true,
		links: [],
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

	test.deepEqual(_.orderBy(_.map(results, 'id')), _.orderBy([ id1, id2 ]))
})

ava.test('.query() should return inactive cards', async (test) => {
	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		slug: 'johnsmith',
		type: 'card',
		active: false,
		links: [],
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
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	await test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			number: 1
		}
	})

	const results = await test.context.kernel.query(test.context.kernel.sessions.admin, {
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

	test.deepEqual(results, [
		{
			tags: [ 'foo' ],
			data: {
				number: 1
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
				type: 'array'
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
				links: [],
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
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'card-bar',
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
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.kernel.sessions.admin, {
				slug: 'johndoe',
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
			active: false,
			type: 'card',
			data: {
				test: 2
			}
		})
	}).catch(test.end)
})
