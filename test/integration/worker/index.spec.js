/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')
const Worker = require('../../../lib/worker')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

ava('.getId() should preserve the same id during its lifetime', async (test) => {
	const id1 = test.context.worker.getId()
	const id2 = test.context.worker.getId()
	const id3 = test.context.worker.getId()
	const id4 = test.context.worker.getId()
	const id5 = test.context.worker.getId()

	test.deepEqual(id1, id2)
	test.deepEqual(id2, id3)
	test.deepEqual(id3, id4)
	test.deepEqual(id4, id5)
})

ava('.getId() different workers should get different ids', async (test) => {
	const worker1 = new Worker(
		test.context.jellyfish,
		test.context.session,
		actionLibrary,
		test.context.queue)
	const worker2 = new Worker(
		test.context.jellyfish,
		test.context.session,
		actionLibrary,
		test.context.queue)
	const worker3 = new Worker(
		test.context.jellyfish,
		test.context.session,
		actionLibrary,
		test.context.queue)

	test.not(worker1.getId(), worker2.getId())
	test.not(worker1.getId(), worker3.getId())
	test.not(worker2.getId(), worker3.getId())
})

ava('should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user')
	const createUserRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)

	await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())

	test.truthy(request)
	test.falsy(request.data.arguments.password.hash.string)
	test.falsy(request.data.arguments.password.hash.salt)
})

ava('should fail to create an event with an action-create-card', async (test) => {
	const cardType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type')

	const id = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const typeResult = await test.context.queue.waitResults(
		test.context.context, id)
	test.false(typeResult.error)

	const threadId = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const threadResult = await test.context.queue.waitResults(
		test.context.context, threadId)
	test.false(threadResult.error)

	await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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

ava('.execute() should execute an action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(result.error)
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.data.id)
	test.is(card.data.foo, 'bar')
})

ava('.execute() should add an execution event to the action request', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
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
						const: request.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'execute')
})

ava('.insertCard() should pass a triggered action originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')

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
			action: 'action-test-originator',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	await test.context.worker.insertCard(
		test.context.context, test.context.session, typeCard, {
			timestamp: new Date().toISOString(),
			actor: test.context.actor.id,
			attachEvents: true,
			override: false
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz')
	test.is(card.data.originator, 'cb3523c5-b37d-41c8-ae32-9e7cc9309165')
})

ava('.insertCard() should take an originator option', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')

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
			action: 'action-test-originator',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	await test.context.worker.insertCard(
		test.context.context, test.context.session, typeCard, {
			timestamp: new Date().toISOString(),
			actor: test.context.actor.id,
			originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			attachEvents: true,
			override: false
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz')
	test.is(card.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
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

	const request = await test.context.queue.enqueue(
		test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz')
	test.truthy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo')

	test.is(resultCard.data.command, 'foo-bar-baz')
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

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
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

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'foo-bar-baz')
	test.truthy(card)
})

ava('.execute() should add a create event when creating a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
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

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const typeResult = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const threadResult = await test.context.queue.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest1 = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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

	const messageRequest2 = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const messageResult1 = await test.context.queue.waitResults(
		test.context.context, messageRequest1)
	const messageResult2 = await test.context.queue.waitResults(
		test.context.context, messageRequest2)
	test.false(messageResult1.error)
	test.false(messageResult2.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(_.sortBy(thread.data.mentions), _.sortBy([ 'johndoe', 'janedoe', 'johnsmith' ]))
})

ava('.execute() AGGREGATE should create a property on the target if it does not exist', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const typeResult = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const threadResult = await test.context.queue.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(thread.data.mentions, [ 'johndoe' ])
})

ava('.execute() AGGREGATE should work with $$ prefixed properties', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const typeResult = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const threadResult = await test.context.queue.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)

	test.deepEqual(thread.data.$$mentions, [ 'johndoe' ])
})

ava('.execute() should create a message with tags', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')

	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const typeResult = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const threadResult = await test.context.queue.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.falsy(request)
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.falsy(request)
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.falsy(request)
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.deepEqual(request.data.arguments.properties.data, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.deepEqual(request, test.context.jellyfish.defaults({
		id: request.id,
		created_at: request.created_at,
		name: null,
		links: request.links,
		slug: request.slug,
		type: 'action-request',
		data: {
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			context: test.context.context,
			action: actionCard.slug,
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
	}))
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	test.deepEqual(request, test.context.jellyfish.defaults({
		id: request.id,
		slug: request.slug,
		name: null,
		links: request.links,
		created_at: request.created_at,
		updated_at: null,
		type: 'action-request',
		data: {
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card'
			},
			context: test.context.context,
			action: actionCard.slug,
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
		}
	}))
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.worker.getId())
	const requestDate = new Date(request.data.timestamp)
	test.false(requestDate.getTime() < Date.now())
})

ava('.tick() should enqueue two actions if there are two time triggers with a past start dates', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	test.context.worker.setTriggers(test.context.context, [
		test.context.jellyfish.defaults({
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
		}),
		test.context.jellyfish.defaults({
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
		})
	])

	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date('2018-08-06T12:00:00.000Z')
	})

	const actionRequests = _.sortBy(await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			required: [ 'type' ],
			additionalProperties: true,
			properties: {
				type: {
					type: 'string',
					const: 'action-request'
				}
			}
		}), (actionRequest) => {
		return actionRequest.data.originator
	})

	test.deepEqual(actionRequests, [
		test.context.jellyfish.defaults({
			id: actionRequests[0].id,
			slug: actionRequests[0].slug,
			name: null,
			links: actionRequests[0].links,
			created_at: actionRequests[0].created_at,
			type: 'action-request',
			data: {
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					type: 'card'
				},
				context: test.context.context,
				action: actionCard.slug,
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
			}
		}),
		test.context.jellyfish.defaults({
			id: actionRequests[1].id,
			slug: actionRequests[1].slug,
			name: null,
			links: actionRequests[1].links,
			created_at: actionRequests[1].created_at,
			type: 'action-request',
			data: {
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					type: 'card'
				},
				context: test.context.context,
				action: actionCard.slug,
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
		})
	])
})

ava('should be able to login as a user with a password', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user')
	const createUserRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const signupResult = await test.context.queue.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const loginRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const loginResult = await test.context.queue.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)

	const session = await test.context.jellyfish.getCardById(test.context.context, test.context.session, loginResult.data.id)

	test.deepEqual(session, test.context.kernel.defaults({
		created_at: session.created_at,
		linked_at: session.linked_at,
		name: null,
		id: session.id,
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

	const loginRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-session',
		context: test.context.context,
		card: user.id,
		type: user.type,
		arguments: {
			password: {}
		}
	})

	await test.context.flush(test.context.session)
	const loginResult = await test.context.queue.waitResults(
		test.context.context, loginRequest)
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

	await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createUserRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const signupResult = await test.context.queue.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const request = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const result = await test.context.queue.waitResults(
		test.context.context, request)
	test.false(result.error)

	await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		updated_at: updateResult.data.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		slug: 'foo',
		name: null,
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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		updated_at: updateResult.data.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		version: '1.0.0',
		name: null,
		slug: 'foo',
		type: 'card',
		active: false,
		links: card.links
	}))
})

ava('should update a card to set active to false using the card slug as input', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		updated_at: updateResult.data.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card',
		name: null,
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false,
		links: card.links
	}))
})

ava('should update a card to override an array property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)

	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		updated_at: updateResult.data.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card',
		name: null,
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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
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
			linked_at: timeline[0].linked_at,
			updated_at: null,
			id: timeline[0].id,
			name: null,
			version: '1.0.0',
			type: 'create',
			slug: timeline[0].slug,
			links: timeline[0].links,
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
			updated_at: null,
			linked_at: timeline[1].linked_at,
			id: timeline[1].id,
			name: null,
			version: '1.0.0',
			type: 'update',
			slug: timeline[1].slug,
			links: timeline[1].links,
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[1].data.timestamp,
				payload: {
					created_at: timeline[1].data.payload.created_at,
					updated_at: null,
					linked_at: timeline[1].data.payload.linked_at,
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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const deleteRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-delete-card',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {}
	})

	await test.context.flush(test.context.session)
	const deleteResult = await test.context.queue.waitResults(
		test.context.context, deleteRequest)
	test.false(deleteResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, deleteResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: deleteResult.data.created_at,
		updated_at: deleteResult.data.updated_at,
		linked_at: card.linked_at,
		id: deleteResult.data.id,
		name: null,
		version: '1.0.0',
		slug: 'foo',
		type: 'card',
		active: false,
		links: card.links
	}))
})

ava('should delete a card using action-update-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateResult.data.created_at,
		updated_at: updateResult.data.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		name: null,
		type: 'card',
		slug: 'foo',
		version: '1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should post an error execute event if logging in as a disallowed user', async (test) => {
	const adminCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'user-admin')

	const loginRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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

	const loginResult = await test.context.queue.waitResults(
		test.context.context, loginRequest)
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

	const cardRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {}
		}
	})

	await test.context.flush(test.context.session)
	const cardResult = await test.context.queue.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
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

	const cardRequest = await test.context.queue.enqueue(test.context.worker.getId(), session, {
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
	const cardResult = await test.context.queue.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
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

	const cardRequest = await test.context.queue.enqueue(test.context.worker.getId(), session, {
		action: 'action-create-card',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {}
		}
	})

	await test.context.flush(session)
	const cardResult = await test.context.queue.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.enqueue(test.context.worker.getId(), session, {
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
	const messageResult = await test.context.queue.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), session, {
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
	await test.context.queue.waitResults(
		test.context.context, updateRequest)

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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
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
	const createRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const createResult = await test.context.queue.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.enqueue(test.context.worker.getId(), test.context.session, {
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
	const updateResult = await test.context.queue.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)
	test.deepEqual(updateResult.data.slug, 'foo')
	test.deepEqual(updateResult.data.version, '1.0.0')
	test.deepEqual(updateResult.data.data, data)
})
