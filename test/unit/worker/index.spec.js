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
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')
const queue = require('../../../lib/queue')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

ava('.length() should be zero by default', async (test) => {
	const length = await test.context.worker.length()
	test.is(length, 0)
})

ava('.enqueue() should increment length by one', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const length = await test.context.worker.length()
	test.is(length, 1)
})

ava('.enqueue() should include the actor from the passed session', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const session = await test.context.jellyfish.getCardById(test.context.context, test.context.session, test.context.session)
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.is(session.data.actor, request.actor)
})

ava('.enqueue() should include the whole passed action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.deepEqual(request.action, actionCard)
})

ava('.enqueue() should set an originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.is(request.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

ava('.enqueue() should take a current date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const date = new Date()

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		currentDate: date,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.is(request.timestamp, date.toISOString())
})

ava('.enqueue() should set a present timestamp', async (test) => {
	const currentDate = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.true(new Date(request.timestamp) >= currentDate)
})

ava('.enqueue() should throw if the action was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.throwsAsync(test.context.worker.enqueue(test.context.session, {
		action: 'action-foo-bar',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	}), test.context.worker.errors.WorkerInvalidAction)
})

ava('.enqueue() should throw if the session was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.throwsAsync(test.context.worker.enqueue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	}), test.context.jellyfish.errors.JellyfishNoElement)
})

ava('.enqueue() should not store the password in the queue when using action-create-user', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-user',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.falsy(request.arguments.hash.string)
	test.falsy(request.arguments.hash.salt)
})

ava('.enqueue() should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user')
	const createUserRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-user',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createUserRequest)
	test.false(result.error)

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: result.data.slug
				}
			}
		}
	})

	const request = await test.context.worker.dequeue()
	test.falsy(request.arguments.password.hash.string)
	test.falsy(request.arguments.password.hash.salt)
})

ava('enqueue() should fail to create an event with an action-create-card', async (test) => {
	const cardType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const id = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread'
							},
							data: {
								type: 'object',
								properties: {
									mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload.mentions")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, id)
	test.false(typeResult.error)

	const threadId = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, threadId)
	test.false(threadResult.error)

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		card: cardType.id,
		context: test.context.context,
		type: cardType.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'bar',
				data: {
					timestamp: '2018-05-05T00:21:02.459Z',
					target: threadResult.data.id,
					actor: test.context.actor.id,
					payload: {
						mentions: [ 'johndoe' ]
					}
				}
			}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		'You may not use card actions to create an event'
	)
})

ava('.dequeue() should return nothing if no requests', async (test) => {
	const length = await test.context.worker.length()
	test.is(length, 0)
	const request = await test.context.worker.dequeue()
	test.falsy(request)
})

ava('.dequeue() should reduce the length', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 1
				}
			}
		}
	})

	await test.context.worker.dequeue()
	const length = await test.context.worker.length()
	test.is(length, 0)
})

ava('.execute() should execute an action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.data.id)
	test.is(card.data.foo, 'bar')
})

ava('.execute() should add an execution event to the action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: actionCard.slug,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: actionCard.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'execute')
})

ava('.execute() should execute a triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.worker.enqueue(test.context.session, {
		action: actionCard.slug,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'foo-bar-baz')
	test.truthy(card)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'payload', 'target' ],
				additionalProperties: true,
				properties: {
					payload: {
						type: 'object',
						required: [ 'data' ],
						properties: {
							data: {
								type: 'object',
								required: [ 'slug' ],
								properties: {
									slug: {
										type: 'string',
										const: 'foo-bar-baz'
									}
								}
							}
						}
					},
					target: {
						type: 'string',
						const: actionCard.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].data.originator, 'cb3523c5-b37d-41c8-ae32-9e7cc9309165')
})

ava('.execute() should not execute a triggered action with a future start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			startDate: '2500-01-01T00:00:00.000Z',
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.worker.enqueue(test.context.session, {
		action: actionCard.slug,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'foo-bar-baz')
	test.falsy(card)
})

ava('.execute() should execute a triggered action with a top level anyOf', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				anyOf: [
					{
						properties: {
							data: {
								type: 'object',
								required: [ 'command' ],
								properties: {
									command: {
										type: 'string',
										const: 'foo-bar-baz'
									}
								}
							}
						}
					},
					{
						properties: {
							data: {
								type: 'string'
							}
						}
					}
				]
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.worker.enqueue(test.context.session, {
		action: actionCard.slug,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'foo-bar-baz')
	test.truthy(card)
})

ava('.execute() should add a create event when creating a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: actionCard.slug,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: result.data.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'create')
})

ava('.execute() should be able to AGGREGATE based on the card timeline', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread'
							},
							data: {
								type: 'object',
								properties: {
									mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload.mentions")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, threadRequest)
	test.false(threadResult.error)

	const messageRequest1 = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			payload: {
				mentions: [ 'johndoe' ]
			}
		}
	})

	const messageRequest2 = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			payload: {
				mentions: [ 'janedoe', 'johnsmith' ]
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult1 = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest1)
	const messageResult2 = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest2)
	test.false(messageResult1.error)
	test.false(messageResult2.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(_.sortBy(thread.data.mentions), _.sortBy([ 'johndoe', 'janedoe', 'johnsmith' ]))
})

ava('.execute() AGGREGATE should create a property on the target if it does not exist', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread'
							},
							data: {
								type: 'object',
								properties: {
									mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload.mentions")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				mentions: [ 'johndoe' ]
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(thread.data.mentions, [ 'johndoe' ])
})

ava('.execute() AGGREGATE should work with $$ prefixed properties', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread'
							},
							data: {
								type: 'object',
								properties: {
									$$mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload[\'$$mentions\']")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeResult.data.id,
		type: 'type',
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					$$mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		card: threadResult.data.id,
		context: test.context.context,
		type: 'test-thread',
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				$$mentions: [ 'johndoe' ]
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)

	test.deepEqual(thread.data.$$mentions, [ 'johndoe' ])
})

ava('.execute() should create a message with tags', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread'
							}
						},
						additionalProperties: true,
						required: [ 'type' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [ 'testtag' ],
			payload: {
				$$mentions: [ 'johndoe' ]
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest)
	test.false(messageResult.error)

	test.deepEqual(messageResult.data.tags, [ 'testtag' ])
})

ava('.getTriggers() should initially be an empty array', (test) => {
	const triggers = test.context.worker.getTriggers()
	test.deepEqual(triggers, [])
})

ava('.setTriggers() should be able to set a trigger with a start date', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			startDate: '2008-01-01T00:00:00.000Z',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			startDate: '2008-01-01T00:00:00.000Z',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should be able to set a trigger with an interval', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			interval: 'PT1H',
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			interval: 'PT1H',
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should be able to set triggers', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			action: 'action-foo-bar',
			card: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			action: 'action-foo-bar',
			card: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'baz'
			}
		}
	])
})

ava('.setTriggers() should not store extra properties', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			foo: 'bar',
			bar: 'baz',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	const triggers = test.context.worker.getTriggers()

	test.deepEqual(triggers, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should throw if no interval nor filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				action: 'action-create-card',
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if both interval and filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				interval: 'PT1H',
				filter: {
					type: 'object'
				},
				type: 'card',
				action: 'action-create-card',
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if no id', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				action: 'action-create-card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if id is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 999,
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				action: 'action-create-card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if interval is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				action: 'action-create-card',
				interval: 999,
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if no action', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if action is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 1,
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if no card', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				type: 'card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if card is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				card: 1,
				type: 'card',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if no filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				type: 'card',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if filter is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				type: 'card',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: 'foo',
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if no arguments', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				type: 'card',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				}
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.setTriggers() should throw if arguments is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card',
				type: 'card',
				card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: 1
			}
		])
	}, test.context.worker.errors.WorkerInvalidTrigger)
})

ava('.tick() should not enqueue actions if there are no triggers', async (test) => {
	test.context.worker.setTriggers(test.context.context, [])
	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date()
	})

	const length = await test.context.worker.length()
	test.is(length, 0)
})

ava('.tick() should not enqueue actions if there are no time triggers', async (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date()
	})

	const length = await test.context.worker.length()
	test.is(length, 0)
})

ava('.tick() should not enqueue an action if there is a time trigger with a future start date', async (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar',
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			interval: 'PT1H',
			startDate: '2018-09-05T12:00:00.000Z',
			arguments: {
				foo: 'bar'
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-05T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 0)
})

ava('.tick() should evaluate the current timestamp in a time triggered action', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				properties: {
					slug: 'foo',
					data: {
						timestamp: {
							$eval: 'timestamp'
						}
					}
				}
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-06T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 1)

	const request = await test.context.worker.dequeue()
	test.deepEqual(request.arguments.properties.data, {
		timestamp: '2018-08-06T12:00:00.000Z'
	})
})

ava('.tick() should enqueue an action if there is a time trigger with a past start date', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-06T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 1)

	const request = await test.context.worker.dequeue()
	test.deepEqual(request, {
		id: request.id,
		card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		context: test.context.context,
		action: actionCard,
		actor: test.context.actor.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		timestamp: '2018-08-06T12:00:00.000Z',
		epoch: 1533556800000,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo'
			}
		}
	})
})

ava('.tick() should enqueue an action if there is a time trigger with a present start date', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-05T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 1)

	const request = await test.context.worker.dequeue()
	test.deepEqual(request, {
		id: request.id,
		card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		context: test.context.context,
		action: actionCard,
		actor: test.context.actor.id,
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		timestamp: '2018-08-05T12:00:00.000Z',
		epoch: 1533470400000,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo'
			}
		}
	})
})

ava('.tick() should not enqueue an action using a past timestamp', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1H',
			startDate: '2050-08-05T12:00:00.000Z',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2050-08-06T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 1)

	const request = await test.context.worker.dequeue()
	const requestDate = new Date(request.timestamp)
	test.false(requestDate.getTime() < Date.now())
})

ava('.tick() should enqueue two actions if there are two time triggers with a past start dates', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		},
		{
			id: '673bc300-88f7-4376-92ed-d32543d69429',
			action: actionCard.slug,
			type: 'card',
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT2D',
			startDate: '2018-08-04T12:00:00.000Z',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'bar'
				}
			}
		}
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-06T12:00:00.000Z')
	})

	const length = await test.context.worker.length()
	test.is(length, 2)

	const requests = _.sortBy([
		await test.context.worker.dequeue(),
		await test.context.worker.dequeue()
	], [ 'originator' ])

	test.deepEqual(requests, [
		{
			id: requests[0].id,
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			context: test.context.context,
			action: actionCard,
			actor: test.context.actor.id,
			originator: '673bc300-88f7-4376-92ed-d32543d69429',
			timestamp: '2018-08-06T12:00:00.000Z',
			epoch: 1533556800000,
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'bar'
				}
			}
		},
		{
			id: requests[1].id,
			card: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			type: 'card',
			context: test.context.context,
			action: actionCard,
			actor: test.context.actor.id,
			originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			timestamp: '2018-08-06T12:00:00.000Z',
			epoch: 1533556800000,
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		}
	])
})

ava('should be able to login as a user with a password', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user')
	const createUserRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-user',
		card: typeCard.id,
		context: test.context.context,
		type: typeCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'foobarbaz',
				salt: 'user-johndoe'
			}
		}
	})

	await test.context.flush(test.context.session)
	const signupResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createUserRequest)
	test.false(signupResult.error)

	const loginRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: signupResult.data.slug
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const loginResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, loginRequest)
	test.false(loginResult.error)

	const session = await test.context.jellyfish.getCardById(test.context.context, test.context.session, loginResult.data.id)
	test.deepEqual(session, test.context.kernel.defaults({
		created_at: loginResult.data.created_at,
		id: loginResult.data.id,
		slug: session.slug,
		version: '1.0.0',
		type: 'session',
		links: session.links,
		data: {
			actor: signupResult.data.id,
			expiration: loginResult.data.data.expiration
		}
	}))

	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava('should be able to login as a password-less user', async (test) => {
	const user = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'user',
		version: '1.0.0',
		slug: 'user-johndoe',
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const loginRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: user.id,
		type: user.type,
		arguments: {
			password: {}
		}
	})

	await test.context.flush(test.context.session)
	const loginResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, loginRequest)
	test.false(loginResult.error)

	const session = await test.context.jellyfish.getCardById(test.context.context, test.context.session, loginResult.data.id)
	test.is(session.data.actor, user.id)
	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava('should not be able to login as a password-less disallowed user', async (test) => {
	const user = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'user',
		version: '1.0.0',
		slug: 'user-johndoe',
		data: {
			disallowLogin: true,
			email: 'johndoe@example.com',
			roles: []
		}
	})

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: user.id,
		type: user.type,
		arguments: {
			password: {}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		test.context.worker.errors.WorkerAuthenticationError)
})

ava('should fail if signing up with the wrong password', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user')
	const createUserRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-user',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			hash: {
				string: 'xxxxxxxxxxxx',
				salt: 'user-johndoe'
			}
		}
	})

	await test.context.flush(test.context.session)
	const signupResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createUserRequest)
	test.false(signupResult.error)

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: signupResult.data.slug
				}
			}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		test.context.worker.errors.WorkerAuthenticationError)
})

ava('should fail to update a card if the schema does not match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const request = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, request)
	test.false(result.error)

	await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				foobar: true
			}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		test.context.worker.errors.WorkerSchemaMismatch)
})

ava('should update a card to add an extra property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				data: {
					bar: 'baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		id: updateResult.data.id,
		slug: 'foo',
		version: '1.0.0',
		type: 'card',
		links: card.links,
		data: {
			foo: 'bar',
			bar: 'baz'
		}
	}))
})

ava('should update a card to set active to false', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				active: false
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		id: updateResult.data.id,
		version: '1.0.0',
		slug: 'foo',
		type: 'card',
		active: false,
		links: card.links
	}))
})

ava('should update a card to set active to false using the card slug as input', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: 'foo-bar-baz',
		type: 'card',
		arguments: {
			properties: {
				version: '1.0.0',
				active: false
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		id: updateResult.data.id,
		type: 'card',
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false,
		links: card.links
	}))
})

ava('should update a card to override an array property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					roles: [ 'guest' ]
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				data: {
					roles: []
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)

	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		id: updateResult.data.id,
		type: 'card',
		slug: 'foo',
		version: '1.0.0',
		links: card.links,
		data: {
			roles: []
		}
	}))
})

ava('should add an update event if updating a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 1
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				data: {
					foo: 2
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: createResult.data.id
					}
				}
			}
		}
	})

	test.deepEqual(timeline, [
		{
			created_at: timeline[0].created_at,
			id: timeline[0].id,
			version: '1.0.0',
			type: 'create',
			slug: timeline[0].slug,
			links: {
				'is attached to': [
					{
						$link: timeline[0].links['is attached to'][0].$link,
						id: createResult.data.id,
						slug: 'foo',
						type: 'card'
					}
				]
			},
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[0].data.timestamp,
				payload: {
					slug: 'foo',
					type: 'card',
					version: '1.0.0',
					data: {
						foo: 1
					}
				}
			}
		},
		{
			created_at: timeline[1].created_at,
			id: timeline[1].id,
			version: '1.0.0',
			type: 'update',
			slug: timeline[1].slug,
			links: {
				'is attached to': [
					{
						$link: timeline[1].links['is attached to'][0].$link,
						id: createResult.data.id,
						slug: 'foo',
						type: 'card'
					}
				]
			},
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[1].data.timestamp,
				payload: {
					created_at: timeline[1].data.payload.created_at,
					active: true,
					slug: 'foo',
					type: 'card',
					version: '1.0.0',
					links: timeline[1].data.payload.links,
					tags: [],
					markers: [],
					requires: [],
					capabilities: [],
					data: {
						foo: 2
					}
				}
			}
		}
	].map(test.context.kernel.defaults))
})

ava('should delete a card using action-delete-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const deleteRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-delete-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {}
	})

	await test.context.flush(test.context.session)
	const deleteResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, deleteRequest)
	test.false(deleteResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, deleteResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: deleteResult.data.created_at,
		id: deleteResult.data.id,
		version: '1.0.0',
		slug: 'foo',
		type: 'card',
		active: false,
		links: card.links
	}))
})

ava('should delete a card using action-update-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				version: '1.0.0',
				active: false
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		id: updateResult.data.id,
		type: 'card',
		slug: 'foo',
		version: '1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should post an error execute event if logging in as a disallowed user', async (test) => {
	const adminCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user-admin')

	const loginRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: adminCard.id,
		type: adminCard.type,
		arguments: {
			password: {
				hash: {
					string: 'foobarbaz',
					salt: adminCard.slug
				}
			}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		test.context.worker.errors.WorkerAuthenticationError)

	const loginResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, loginRequest)
	test.deepEqual(loginResult, {
		error: true,
		timestamp: loginResult.timestamp,
		data: {
			expected: true,
			message: 'Login disallowed',
			name: 'WorkerAuthenticationError',
			stack: loginResult.data.stack
		}
	})
})

ava('action-create-event should create a link card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')

	const cardRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {}
		}
	})

	await test.context.flush(test.context.session)
	const cardResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-event',
		context: test.context.context,
		card: cardResult.data.id,
		type: cardResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				message: 'johndoe'
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, messageRequest)
	test.false(messageResult.error)

	const [ link ] = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'link'
			},
			data: {
				type: 'object',
				properties: {
					from: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								const: messageResult.data.id
							}
						},
						required: [ 'id' ]
					}
				},
				required: [ 'from' ]
			}
		},
		required: [ 'type', 'data' ],
		additionalProperties: true
	})

	test.deepEqual(link, test.context.jellyfish.defaults({
		created_at: link.created_at,
		id: link.id,
		slug: link.slug,
		name: 'is attached to',
		type: 'link',
		data: {
			inverseName: 'has attached element',
			from: {
				id: messageResult.data.id,
				type: 'message'
			},
			to: {
				id: cardResult.data.id,
				type: 'card'
			}
		}
	}))
})

ava('events should always inherit their parent\'s markers', async (test) => {
	const {
		context,
		jellyfish,
		session
	} = test.context

	const marker = 'org-test'
	const typeCard = await jellyfish.getCardBySlug(context, session, 'card', {
		type: 'type'
	})

	const cardRequest = await test.context.worker.enqueue(session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				markers: [ marker ]
			}
		}
	})

	await test.context.flush(session)
	const cardResult = await queue.waitResults(
		test.context.context, jellyfish, session, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.worker.enqueue(session, {
		action: 'action-create-event',
		context: test.context.context,
		card: cardResult.data.id,
		type: cardResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				message: 'johndoe'
			}
		}
	})

	await test.context.flush(session)
	const messageResult = await queue.waitResults(
		test.context.context, jellyfish, session, messageRequest)
	test.false(messageResult.error)

	test.deepEqual(messageResult.data.markers, [ marker ])
})

ava('Updating a cards markers should update the markers of attached events', async (test) => {
	const {
		context,
		jellyfish,
		session
	} = test.context
	const marker = 'org-test'
	const typeCard = await jellyfish.getCardBySlug(context, session, 'card', {
		type: 'type'
	})

	const cardRequest = await test.context.worker.enqueue(session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {}
		}
	})

	await test.context.flush(session)
	const cardResult = await queue.waitResults(
		test.context.context, jellyfish, session, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.worker.enqueue(session, {
		action: 'action-create-event',
		context: test.context.context,
		card: cardResult.data.id,
		type: cardResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				message: 'johndoe'
			}
		}
	})

	await test.context.flush(session)
	const messageResult = await queue.waitResults(
		test.context.context, jellyfish, session, messageRequest)
	test.false(messageResult.error)

	const updateRequest = await test.context.worker.enqueue(session, {
		action: 'action-update-card',
		context: test.context.context,
		card: cardResult.data.id,
		type: cardResult.data.type,
		arguments: {
			properties: {
				markers: [ marker ]
			}
		}
	})

	await test.context.flush(session)
	await queue.waitResults(
		test.context.context, jellyfish, session, updateRequest)

	const message = await jellyfish.getCardById(context, session, messageResult.data.id)

	test.deepEqual(message.markers, [ marker ])
})

ava('should be able to insert a deeply nested card', async (test) => {
	const data = {
		foo: {
			bar: {
				baz: {
					qux: {
						foo: {
							bar: {
								baz: {
									qux: {
										foo: {
											bar: {
												baz: {
													qux: {
														foo: {
															bar: {
																baz: {
																	qux: {
																		test: 1
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)
	test.deepEqual(createResult.data.slug, 'foo')
	test.deepEqual(createResult.data.version, '1.0.0')
	test.deepEqual(createResult.data.data, data)
})

ava('should be able to upsert a deeply nested card', async (test) => {
	const data = {
		foo: {
			bar: {
				baz: {
					qux: {
						foo: {
							bar: {
								baz: {
									qux: {
										foo: {
											bar: {
												baz: {
													qux: {
														foo: {
															bar: {
																baz: {
																	qux: {
																		test: 1
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.worker.enqueue(test.context.session, {
		action: 'action-update-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			properties: {
				data
			}
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await queue.waitResults(
		test.context.context, test.context.jellyfish, test.context.session, updateRequest)
	test.false(updateResult.error)
	test.deepEqual(updateResult.data.slug, 'foo')
	test.deepEqual(updateResult.data.version, '1.0.0')
	test.deepEqual(updateResult.data.data, data)
})
