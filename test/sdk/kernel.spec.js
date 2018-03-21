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
const cardType = require('../../lib/sdk/card-type')
const jsonSchema = require('../../lib/sdk/json-schema')

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
		requests: 'requests'
	}

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: test.context.buckets
	})

	await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

ava.test('should be able to disconnect the kernel multiple times without errors', async (test) => {
	test.notThrows(async () => {
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
		await test.context.kernel.disconnect()
	})
})

ava.test('.insertCard() should throw an error if the element is not a valid card', async (test) => {
	await test.throws(test.context.kernel.insertCard({
		hello: 'world'
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
	await test.throws(test.context.kernel.insertCard({
		slug: 'action-foo-bar',
		type: 'action',
		active: true,
		links: [],
		tags: [],
		data: {}
	}), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throws(test.context.kernel.insertCard({
		type: 'foobarbazqux',
		active: true,
		links: [],
		tags: [],
		data: {}
	}), errors.JellyfishUnknownCardType)
})

ava.test('.insertCard() should be able to insert a card', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'hello-world',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCard(id)

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

ava.test('.insertCard() should provide sensible defaults', async (test) => {
	const id = await test.context.kernel.insertCard({
		type: 'card'
	})

	const element = await test.context.kernel.getCard(id)

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

	await test.context.kernel.insertCard(card)
	await test.throws(test.context.kernel.insertCard(card), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertCard() should replace an element given override is true', async (test) => {
	const id1 = await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const id2 = await test.context.kernel.insertCard({
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

	const element = await test.context.kernel.getCard(id1)

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

	const id = await test.context.kernel.insertCard(request)
	test.deepEqual(await test.context.backend.getElementById(test.context.buckets.cards, id), null)
	test.deepEqual(await test.context.backend.getElementById(test.context.buckets.requests, id), Object.assign({
		id
	}, request))
})

ava.test('.getCard() there should be an admin card', async (test) => {
	const card = await test.context.kernel.getCard('user-admin')
	test.truthy(card)
})

ava.test('.getCard() should find an active card by its id', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCard(id)

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

ava.test('.getCard() should find an active card by its slug', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCard('foo-bar')

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

ava.test('.getCard() should not return an inactive card by its id', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCard(id)
	test.deepEqual(card, null)
})

ava.test('.getCard() should not return an inactive card by its slug', async (test) => {
	await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCard('foo-bar')
	test.deepEqual(card, null)
})

ava.test('.getCard() should return an inactive card by its id if the inactive option is true', async (test) => {
	const id = await test.context.kernel.insertCard({
		slug: 'foo-bar',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {}
	})

	const card = await test.context.kernel.getCard(id, {
		inactive: true
	})

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
	const id1 = await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io'
		}
	})

	await test.context.kernel.insertCard({
		slug: 'johnsmith',
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			email: 'johnsmith@example.io'
		}
	})

	const results = await test.context.kernel.query({
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
			active: true,
			slug: 'johndoe',
			type: 'card',
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava.test('.query() should not return inactive cards by default', async (test) => {
	await test.context.kernel.insertCard({
		slug: 'johndoe',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {
			email: 'johndoe@example.io'
		}
	})

	await test.context.kernel.insertCard({
		slug: 'johnsmith',
		type: 'card',
		active: false,
		links: [],
		tags: [],
		data: {
			email: 'johnsmith@example.io'
		}
	})

	const results = await test.context.kernel.query({
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: 'doe$'
			}
		},
		required: [ 'slug' ]
	})

	test.deepEqual(results, [])
})

ava.test('.query() should query all cards of a certain type', async (test) => {
	const results = await test.context.kernel.query({
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

	await test.context.kernel.insertCard(request)

	const results = await test.context.kernel.query({
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
			active: true,
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
	const id1 = await test.context.kernel.insertCard({
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

	const id2 = await test.context.kernel.insertCard({
		type: 'card',
		active: true,
		links: [],
		tags: [],
		data: {
			executed: false
		}
	})

	const results = await test.context.kernel.query({
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

ava.test('.query() should return inactive cards if the inactive option is true', async (test) => {
	await test.context.kernel.insertCard({
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

	const results = await test.context.kernel.query({
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				pattern: 'smith$'
			}
		},
		required: [ 'slug' ]
	}, {
		inactive: true
	})

	test.deepEqual(results, [
		{
			slug: 'johnsmith'
		}
	])
})

ava.test('.getContext() should return a valid actor', async (test) => {
	const context = await test.context.kernel.getContext()
	test.true(jsonSchema.isValid(cardType.getSchema(CARDS.core.card), context.actor))
	test.true(jsonSchema.isValid(cardType.getSchema(CARDS.core.user), context.actor))
})

ava.test('.getContext() should return a valid timestamp', async (test) => {
	const context = await test.context.kernel.getContext()
	test.true(jsonSchema.isValid({
		type: 'string',
		format: 'date-time'
	}, context.timestamp))
})

ava.test('.executeInternalAction() should fail if the action does not exist', async (test) => {
	await test.throws(test.context.kernel.executeInternalAction('foobarbazqux', 'user', {
		hello: 'world'
	}), errors.JellyfishNoAction)
})

ava.test.cb('.stream() should report back new elements that match a certain slug', (test) => {
	test.context.kernel.stream({
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
			test.context.kernel.insertCard({
				slug: 'card-foo',
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard({
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
	test.context.kernel.stream({
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
				active: true,
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
			test.context.kernel.insertCard({
				slug: 'card-foo',
				type: 'card',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard({
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
	test.context.kernel.stream({
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
				active: true,
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
			test.context.kernel.insertCard({
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
			test.context.kernel.insertCard({
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
	test.context.kernel.stream({
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
						active: true,
						type: 'action-request'
					}
				},
				{
					before: null,
					after: {
						id: changes[1].after.id,
						active: true,
						type: 'card'
					}
				}
			])

			test.end()
		})

		return test.context.kernel.insertCard({
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
			return test.context.kernel.insertCard({
				type: 'card',
				data: {
					test: 1
				}
			})
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should close without finding anything', (test) => {
	test.context.kernel.stream({
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

ava.test.cb('.stream() should not report back inactive elements by default', (test) => {
	test.context.kernel.stream({
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			active: {
				type: 'boolean'
			},
			type: {
				type: 'string',
				const: 'card'
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
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'card',
				slug: 'card-foo',
				active: true,
				data: {
					test: 1
				}
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.kernel.insertCard({
			slug: 'card-bar',
			active: false,
			type: 'card',
			data: {
				test: 2
			}
		}).then(() => {
			return test.context.kernel.insertCard({
				slug: 'card-foo',
				active: true,
				type: 'card',
				data: {
					test: 1
				}
			})
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should report back inactive elements if the inactive option is true', (test) => {
	test.context.kernel.stream({
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
	}, {
		inactive: true
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

		return test.context.kernel.insertCard({
			slug: 'card-bar',
			active: false,
			type: 'card',
			data: {
				test: 2
			}
		})
	}).catch(test.end)
})

ava.test('.signup() should create a user', async (test) => {
	const id = await test.context.kernel.signup({
		username: 'johndoe',
		email: 'johndoe@example.com',
		password: 'secret'
	})

	const card = await test.context.kernel.getCard(id)

	test.deepEqual(_.omit(card, [ 'data' ]), {
		id,
		slug: 'user-johndoe',
		type: 'user',
		active: true,
		links: [],
		tags: []
	})

	test.is(card.data.email, 'johndoe@example.com')
	test.deepEqual(card.data.roles, [])
	test.true(_.isString(card.data.password.hash))
	test.true(_.isString(card.data.password.salt))
})

ava.test('.signup() should fail if the user already exists', async (test) => {
	await test.throws(test.context.kernel.signup({
		username: 'admin',
		email: 'foo@bar.com',
		password: 'secret'
	}), errors.JellyfishElementAlreadyExists)
})
