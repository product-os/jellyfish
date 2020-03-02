/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')
const Worker = require('../../../lib/worker')
const uuid = require('../../../lib/uuid')

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

	await worker1.initialize(test.context.context)
	await worker2.initialize(test.context.context)
	await worker3.initialize(test.context.context)

	test.not(worker1.getId(), worker2.getId())
	test.not(worker1.getId(), worker3.getId())
	test.not(worker2.getId(), worker3.getId())
})

ava('should not re-enqueue requests after duplicated execute events', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {
						foo: 'bar'
					}
				}
			}
		})

	const enqueuedRequest1 = await test.context.dequeue()

	await test.context.queue.consumer.postResults(
		await uuid.random(), test.context.context, enqueuedRequest1, {
			error: false,
			data: {
				id: await uuid.random(),
				type: 'card@1.0.0',
				slug: 'foo'
			}
		})

	await test.throwsAsync(
		test.context.worker.execute(test.context.session, enqueuedRequest1),
		{
			instanceOf: test.context.jellyfish.errors.JellyfishElementAlreadyExists
		})

	const enqueuedRequest2 = await test.context.dequeue()
	test.falsy(enqueuedRequest2)
})

ava('should not re-enqueue requests after execute failure', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {
						foo: 'bar'
					}
				}
			}
		})

	const enqueuedRequest1 = await test.context.dequeue()

	await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.context.queue.consumer.postResults(
		await uuid.random(), test.context.context, enqueuedRequest1, {
			error: false,
			data: {
				id: await uuid.random(),
				type: 'card@1.0.0',
				slug: 'foo'
			}
		})

	await test.throwsAsync(
		test.context.worker.execute(test.context.session, enqueuedRequest1),
		{
			instanceOf: test.context.jellyfish.errors.JellyfishElementAlreadyExists
		})

	const enqueuedRequest2 = await test.context.dequeue()
	test.falsy(enqueuedRequest2)
})

ava('should not store the password in the queue when using action-create-user', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')
	const password = 'foobarbaz'

	const request = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request)
	test.not(createUserRequest.data.arguments.password.string, password)

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)
})

ava('should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			password: plaintextPassword
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)

	await Bluebird.delay(2000)

	const request = await test.context.dequeue()

	test.truthy(request)
	test.not(request.data.arguments.password, plaintextPassword)
})

ava('should not store the passwords in the queue when using action-set-password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)

	const request = await test.context.dequeue()

	test.truthy(request)
	test.truthy(request.data.arguments.currentPassword)
	test.truthy(request.data.arguments.newPassword)
	test.not(request.data.arguments.currentPassword, plaintextPassword)
	test.not(request.data.arguments.newPassword, 'new-password')
})

ava('should not store the passwords when using action-set-password on a first time password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	const resetRequest = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, resetRequest)

	const request = await test.context.dequeue()

	test.truthy(request)
	test.falsy(request.data.arguments.currentPassword)
	test.truthy(request.data.arguments.newPassword)
	test.not(request.data.arguments.newPassword, 'new-password')
})

ava('should not change the password of a password-less user given a password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: 'xxxxxxxxxxxxxxxxxxxxxx',
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should change the password of a password-less user given no password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	const resetRequestPre = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	})

	const resetRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, resetRequestPre)
	await test.context.flush(test.context.session, 1)
	const resetResult = await test.context.queue.producer.waitResults(
		test.context.context, resetRequest)
	test.false(resetResult.error)

	const loginRequestPre = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: userCard.id,
		context: test.context.context,
		type: userCard.type,
		arguments: {
			password: 'new-password'
		}
	})

	const loginRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, loginRequestPre)
	await test.context.flush(test.context.session, 1)
	const loginResult = await test.context.queue.producer.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)

	const user = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)
	test.not(user.data.hash, 'new-password')
})

ava('should change a user password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)
	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: plaintextPassword
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})

	const request3 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: 'new-password'
		}
	})

	const loginRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request3)
	await test.context.flush(test.context.session, 1)
	const loginResult = await test.context.queue.producer.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)
})

ava('should not change a user password given invalid current password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: 'xxxxxxxxxxxxxxxxxxxxxx',
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should not change a user password given a null current password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should change the hash when updating a user password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const userBefore = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, signupResult.data.id)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)
	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const userAfter = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, signupResult.data.id)

	test.truthy(userBefore.data.hash)
	test.truthy(userAfter.data.hash)
	test.not(userBefore.data.hash, userAfter.data.hash)
})

ava('should fail to create an event with an action-create-card', async (test) => {
	const cardType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const id = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread@1.0.0'
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

	await test.context.flush(test.context.session, 1)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, id)
	test.false(typeResult.error)

	const threadId = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadId)
	test.false(threadResult.error)

	await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		card: cardType.id,
		context: test.context.context,
		type: cardType.type,
		arguments: {
			reason: null,
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
		test.context.flush(test.context.session, 1),
		{
			message: 'You may not use card actions to create an event'
		}
	)
})

ava('.execute() should execute an action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.data.id)
	test.is(card.data.foo, 'bar')
})

ava('.execute() should add an execution event to the action request', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
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
	test.is(timeline[0].type, 'execute@1.0.0')
})

ava('.insertCard() should pass a triggered action originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

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
			action: 'action-test-originator@1.0.0',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo-bar-baz',
					version: '1.0.0'
				}
			}
		}
	])

	await test.context.worker.insertCard(
		test.context.context, test.context.session, typeCard, {
			timestamp: new Date().toISOString(),
			actor: test.context.actor.id,
			attachEvents: true
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@1.0.0')
	test.is(card.data.originator, 'cb3523c5-b37d-41c8-ae32-9e7cc9309165')
})

ava('.insertCard() should take an originator option', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

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
			action: 'action-test-originator@1.0.0',
			target: typeCard.id,
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
			attachEvents: true
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.is(card.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

ava('.execute() should execute a triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

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
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.truthy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo@latest')

	test.is(resultCard.data.command, 'foo-bar-baz')
})

ava('a triggered action can update a dynamic list of cards (ids as array of strings)', async (test) => {
	const cardIds = []
	await Bluebird.each([ 1, 2, 3 ], async (idx) => {
		const card = await test.context.jellyfish.insertCard(
			test.context.context, test.context.session, {
				slug: `foo${idx}`,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					id: `id${idx}`
				}
			})
		cardIds.push(card.id)
	})

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'cards' ],
						properties: {
							cards: {
								type: 'array',
								items: {
									type: 'string'
								}
							}
						}
					}
				}
			},
			action: 'action-update-card@1.0.0',
			target: {
				$eval: 'source.data.cards'
			},
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/updated',
						value: true
					}
				]
			}
		}
	])

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					data: {
						cards: cardIds
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	await Bluebird.each([ 1, 2, 3 ], async (idx) => {
		const card = await test.context.jellyfish.getCardBySlug(
			test.context.context, test.context.session, `foo${idx}@latest`)
		test.true(card.data.updated)
	})
})

ava('a triggered action can update a dynamic list of cards (ids as array of objects with field id)', async (test) => {
	const cardsWithId = []
	await Bluebird.each([ 1, 2, 3 ], async (idx) => {
		const card = await test.context.jellyfish.insertCard(
			test.context.context, test.context.session, {
				slug: `foo${idx}`,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					id: `id${idx}`
				}
			})
		cardsWithId.push(_.pick(card, 'id'))
	})

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'cards' ],
						properties: {
							cards: {
								type: 'array',
								items: {
									type: 'object',
									required: [ 'id' ],
									properties: {
										id: {
											type: 'string'
										}
									}
								}
							}
						}
					}
				}
			},
			action: 'action-update-card@1.0.0',
			target: {
				$map: {
					$eval: 'source.data.cards[0:]'
				},
				'each(card)': {
					$eval: 'card.id'
				}
			},
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/updated',
						value: true
					}
				]
			}
		}
	])

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					data: {
						cards: cardsWithId
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	await Bluebird.each([ 1, 2, 3 ], async (idx) => {
		const card = await test.context.jellyfish.getCardBySlug(
			test.context.context, test.context.session, `foo${idx}@latest`)
		test.true(card.data.updated)
	})
})

ava('should fail when attempting to insert a triggered-action card with duplicate targets', async (test) => {
	const trigger = {
		id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		type: 'triggered-action@1.0.0',
		slug: 'triggered-action-12345',
		data: {
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
			action: 'action-update-card@1.0.0',
			target: [ '1', '1', '1' ],
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/updated',
						value: true
					}
				]
			}
		}
	}

	await test.throwsAsync(test.context.jellyfish.insertCard(test.context.context, test.context.session, trigger),
		{
			instanceOf: test.context.backend.errors.JellyfishSchemaMismatch
		})
})

ava('should fail to set a trigger when the list of card ids contains duplicates', async (test) => {
	const card = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'foo1',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				id: 'id1'
			}
		})

	const triggers = [
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
			action: 'action-update-card@1.0.0',
			target: [ card.id, card.id, card.id ],
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/updated',
						value: true
					}
				]
			}
		}
	]

	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, triggers)
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('trigger should fail to update card if triggered by a user not owning the card', async (test) => {
	const card = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: 'foo-admin',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				id: 'id-admin'
			}
		})

	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			filter: {
				type: 'object',
				required: [ 'data' ],
				properties: {
					data: {
						type: 'object',
						required: [ 'cards' ],
						properties: {
							cards: {
								type: 'array',
								items: {
									type: 'object',
									required: [ 'id' ],
									properties: {
										id: {
											type: 'string'
										}
									}
								}
							}
						}
					}
				}
			},
			action: 'action-update-card@1.0.0',
			target: {
				$map: {
					$eval: 'source.data.cards[0:]'
				},
				'each(card)': {
					$eval: 'card.id'
				}
			},
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/updated',
						value: true
					}
				]
			}
		}
	])

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const userJohnDoe = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-john-doe-user',
			data: {
				email: 'accounts+jellyfish@resin.io',
				roles: [ 'user-community' ],
				hash: 'PASSWORDLESS'
			}
		})

	const sessionOfJohnDoe = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session@1.0.0',
			version: '1.0.0',
			slug: 'session-john-doe-user',
			data: {
				actor: userJohnDoe.id
			}
		})
	const sessionIdOfJohnDoe = sessionOfJohnDoe.id

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), sessionIdOfJohnDoe, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					data: {
						cards: [ {
							id: card.id
						} ],
						schema: {}
					}
				}
			}
		})

	await test.throwsAsync(test.context.flush(sessionIdOfJohnDoe, 1),
		{
			instanceOf: test.context.worker.errors.WorkerNoElement
		})
})

ava('.execute() should execute a triggered action given a matching mode', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

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
			mode: 'insert',
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.truthy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo@latest')

	test.is(resultCard.data.command, 'foo-bar-baz')
})

ava('.execute() should not execute a triggered action given a non matching mode', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

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
			mode: 'update',
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.falsy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo@latest')

	test.is(resultCard.data.command, 'foo-bar-baz')
})

ava('.execute() should not execute a triggered action with a future start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

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
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.falsy(card)
})

ava('.execute() should execute a triggered action with a top level anyOf', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

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
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		}
	])

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					command: 'foo-bar-baz'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz@latest')
	test.truthy(card)
})

ava('.execute() should add a create event when creating a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug: 'foo',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
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
	test.is(timeline[0].type, 'create@1.0.0')
})

ava('.execute() should be able to AGGREGATE based on the card timeline', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeType.id,
			type: typeType.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'test-thread',
					version: '1.0.0',
					data: {
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: 'test-thread@1.0.0'
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

	await test.context.flush(test.context.session, 1)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeResult.data.id,
			type: typeResult.data.type,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo',
					data: {
						mentions: []
					}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest1 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: threadResult.data.id,
			type: threadResult.data.type,
			arguments: {
				type: 'message',
				payload: {
					mentions: [ 'johndoe' ],
					message: 'Hello'
				}
			}
		})

	const messageRequest2 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: threadResult.data.id,
			type: threadResult.data.type,
			arguments: {
				type: 'message',
				payload: {
					mentions: [ 'janedoe', 'johnsmith' ],
					message: 'Hello'
				}
			}
		})

	await test.context.flush(test.context.session, 2)
	const messageResult1 = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest1)
	const messageResult2 = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest2)
	test.false(messageResult1.error)
	test.false(messageResult2.error)

	const thread = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(
		_.sortBy(thread.data.mentions),
		_.sortBy([ 'johndoe', 'janedoe', 'johnsmith' ]))
})

ava('.execute() AGGREGATE should create a property on the target if it does not exist', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread@1.0.0'
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

	await test.context.flush(test.context.session, 1)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(thread.data.mentions, [ 'johndoe' ])
})

ava('.execute() AGGREGATE should work with $$ prefixed properties', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread@1.0.0'
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

	await test.context.flush(test.context.session, 1)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: 'type',
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					$$mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		card: threadResult.data.id,
		context: test.context.context,
		type: 'test-thread',
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				$$mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)

	test.deepEqual(thread.data.$$mentions, [ 'johndoe' ])
})

ava('.execute() should create a message with tags', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread@1.0.0'
							}
						},
						additionalProperties: true,
						required: [ 'type' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [ 'testtag' ],
			payload: {
				$$mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const element = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, messageResult.data.id, {
			type: messageResult.data.type
		})

	test.deepEqual(element.tags, [ 'testtag' ])
})

ava('.getTriggers() should initially be an empty array', (test) => {
	const triggers = test.context.worker.getTriggers()
	test.deepEqual(triggers, [])
})

ava('.setTriggers() should be able to set a trigger with a start date', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
			type: 'card@1.0.0',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			action: 'action-foo-bar@1.0.0',
			target: 'a13474e4-7b44-453b-9f3e-aa783b8f37ea',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			filter: {
				type: 'object'
			},
			arguments: {
				foo: 'bar'
			}
		}
	])
})

ava('.setTriggers() should store a mode', (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			mode: 'update',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
			action: 'action-foo-bar@1.0.0',
			mode: 'update',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if mode is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-foo-bar@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				mode: 1,
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if both interval and filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				interval: 'PT1H',
				filter: {
					type: 'object'
				},
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no id', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if id is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 999,
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if interval is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-create-card@1.0.0',
				interval: 999,
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no action', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if action is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 1,
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: {
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no target', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if target is not a string', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				target: 1,
				filter: {
					type: 'object'
				},
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no filter', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if filter is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: 'foo',
				arguments: {
					reason: null,
					foo: 'bar'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if no arguments', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				}
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.setTriggers() should throw if arguments is not an object', (test) => {
	test.throws(() => {
		test.context.worker.setTriggers(test.context.context, [
			{
				id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				action: 'action-create-card@1.0.0',
				target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				filter: {
					type: 'object'
				},
				arguments: 1
			}
		])
	}, {
		instanceOf: test.context.worker.errors.WorkerInvalidTrigger
	})
})

ava('.tick() should not enqueue actions if there are no triggers', async (test) => {
	test.context.worker.setTriggers(test.context.context, [])
	await test.context.worker.tick(test.context.context, test.context.session, {
		currentDate: new Date()
	})

	const request = await test.context.dequeue()
	test.falsy(request)
})

ava('.tick() should not enqueue actions if there are no time triggers', async (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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

	const request = await test.context.dequeue()
	test.falsy(request)
})

ava('.tick() should not enqueue an action if there is a time trigger with a future start date', async (test) => {
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: 'action-foo-bar@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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

	const request = await test.context.dequeue()
	test.falsy(request)
})

ava('.tick() should evaluate the current timestamp in a time triggered action', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				reason: null,
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

	const request = await test.context.dequeue()
	test.deepEqual(request.data.arguments.properties.data, {
		timestamp: '2018-08-06T12:00:00.000Z'
	})
})

ava('.tick() should enqueue an action if there is a time trigger with a past start date', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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

	const request = await test.context.dequeue()
	test.deepEqual(request, test.context.jellyfish.defaults({
		id: request.id,
		created_at: request.created_at,
		name: null,
		links: request.links,
		slug: request.slug,
		type: 'action-request@1.0.0',
		data: {
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
			},
			context: test.context.context,
			action: `${actionCard.slug}@${actionCard.version}`,
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
		test.context.context, test.context.session, 'action-create-card@latest')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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

	const request = await test.context.dequeue()
	test.deepEqual(request, test.context.jellyfish.defaults({
		id: request.id,
		slug: request.slug,
		name: null,
		links: request.links,
		created_at: request.created_at,
		updated_at: null,
		type: 'action-request@1.0.0',
		data: {
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
			},
			context: test.context.context,
			action: `${actionCard.slug}@${actionCard.version}`,
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
		test.context.context, test.context.session, 'action-create-card@latest')
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
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

	const request = await test.context.dequeue()
	const requestDate = new Date(request.data.timestamp)
	test.false(requestDate.getTime() < Date.now())
})

ava('.tick() should enqueue two actions if there are two time triggers with a past start dates', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')
	test.context.worker.setTriggers(test.context.context, [
		test.context.jellyfish.defaults({
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT1D',
			startDate: '2018-08-05T12:00:00.000Z',
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo'
				}
			}
		}),
		test.context.jellyfish.defaults({
			id: '673bc300-88f7-4376-92ed-d32543d69429',
			action: `${actionCard.slug}@${actionCard.version}`,
			type: 'card@1.0.0',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			context: test.context.context,
			interval: 'PT2D',
			startDate: '2018-08-04T12:00:00.000Z',
			arguments: {
				reason: null,
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
					const: 'action-request@1.0.0'
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
			type: 'action-request@1.0.0',
			data: {
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				},
				context: test.context.context,
				action: `${actionCard.slug}@${actionCard.version}`,
				actor: test.context.actor.id,
				originator: '673bc300-88f7-4376-92ed-d32543d69429',
				timestamp: '2018-08-06T12:00:00.000Z',
				epoch: 1533556800000,
				arguments: {
					reason: null,
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
			type: 'action-request@1.0.0',
			data: {
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
				},
				context: test.context.context,
				action: `${actionCard.slug}@${actionCard.version}`,
				actor: test.context.actor.id,
				originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
				timestamp: '2018-08-06T12:00:00.000Z',
				epoch: 1533556800000,
				arguments: {
					reason: null,
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
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		card: typeCard.id,
		context: test.context.context,
		type: typeCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: 'foobarbaz'
		}
	})

	const loginRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)

	await test.context.flush(test.context.session, 1)
	const loginResult = await test.context.queue.producer.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)

	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, loginResult.data.id)

	test.deepEqual(session, test.context.kernel.defaults({
		created_at: session.created_at,
		linked_at: session.linked_at,
		name: null,
		id: session.id,
		slug: session.slug,
		version: '1.0.0',
		type: 'session@1.0.0',
		links: session.links,
		data: {
			actor: signupResult.data.id,
			expiration: session.data.expiration
		}
	}))

	const currentDate = new Date()
	test.true(new Date(session.data.expiration) > currentDate)
})

ava('should not be able to login as a password-less user', async (test) => {
	const user = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-session@1.0.0',
			context: test.context.context,
			card: user.id,
			type: user.type,
			arguments: {}
		})

	await test.throwsAsync(
		test.context.flush(test.context.session, 1),
		{
			instanceOf: test.context.worker.errors.WorkerSchemaMismatch
		})
})

ava('should not be able to login as a password-less user given a random password', async (test) => {
	const user = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context: test.context.context,
		card: user.id,
		type: user.type,
		arguments: {
			password: 'foobar'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should not be able to login as a password-less non-disallowed user', async (test) => {
	const user = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-johndoe',
			data: {
				disallowLogin: false,
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-session@1.0.0',
			context: test.context.context,
			card: user.id,
			type: user.type,
			arguments: {}
		})

	await test.throwsAsync(
		test.context.flush(test.context.session, 1),
		{
			instanceOf: test.context.worker.errors.WorkerSchemaMismatch
		})
})

ava('should not be able to login as a password-less disallowed user', async (test) => {
	const user = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-johndoe',
			data: {
				disallowLogin: true,
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-session@1.0.0',
			context: test.context.context,
			card: user.id,
			type: user.type,
			arguments: {}
		})

	await test.throwsAsync(
		test.context.flush(test.context.session, 1),
		{
			instanceOf: test.context.worker.errors.WorkerSchemaMismatch
		})
})

ava('should fail if signing up with the wrong password', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'xxxxxxxxxxxx'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session, 1)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			password: 'foobarbaz'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should fail to update a card if the schema does not match', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'add',
					path: '/foobar',
					value: true
				}
			]
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session, 1),
		{
			instanceOf: test.context.jellyfish.errors.JellyfishSchemaMismatch
		})
})

ava('should update a card to add an extra property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'add',
					path: '/data/bar',
					value: 'baz'
				}
			]
		}
	})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const updateCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id, {
			type: updateResult.data.type
		})

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateCard.created_at,
		updated_at: updateCard.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		slug: 'foo',
		name: null,
		version: '1.0.0',
		type: 'card@1.0.0',
		links: card.links,
		data: {
			foo: 'bar',
			bar: 'baz'
		}
	}))
})

ava('should update a card to set active to false', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'replace',
					path: '/active',
					value: false
				}
			]
		}
	})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		version: '1.0.0',
		name: null,
		slug: 'foo',
		type: 'card@1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should update a card along with a reason', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: 'This card should have been inactive',
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const timeline = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'update@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					additionalProperties: true,
					properties: {
						target: {
							type: 'string',
							const: updateResult.data.id
						}
					}
				}
			}
		})

	test.is(timeline.length, 1)
	test.is(timeline[0].name, 'This card should have been inactive')
})

ava('should create a new card along with a reason', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: 'My new card',
				properties: {
					slug: 'foo',
					version: '1.0.0'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const timeline = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'create@1.0.0'
				},
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

	test.is(timeline.length, 1)
	test.is(timeline[0].name, 'My new card')
})

ava('should update a card to set active to false using the card slug as input', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: 'foo-bar-baz',
			type: 'card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card@1.0.0',
		name: null,
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false,
		links: card.links
	}))
})

ava('should update a card to override an array property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					roles: [ 'guest' ]
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/roles',
						value: []
					}
				]
			}
		})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)

	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card@1.0.0',
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
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data: {
					foo: 1
				}
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'replace',
					path: '/data/foo',
					value: 2
				}
			]
		}
	})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
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
	}, {
		sortBy: 'created_at'
	})

	test.deepEqual(timeline, [
		{
			created_at: timeline[0].created_at,
			linked_at: timeline[0].linked_at,
			updated_at: null,
			id: timeline[0].id,
			name: null,
			version: '1.0.0',
			type: 'create@1.0.0',
			slug: timeline[0].slug,
			links: timeline[0].links,
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[0].data.timestamp,
				payload: {
					slug: 'foo',
					type: 'card@1.0.0',
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
			type: 'update@1.0.0',
			slug: timeline[1].slug,
			links: timeline[1].links,
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[1].data.timestamp,
				payload: [
					{
						op: 'replace',
						path: '/data/foo',
						value: 2
					}
				]
			}
		}
	].map(test.context.kernel.defaults))
})

ava('should delete a card using action-delete-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const deleteRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-delete-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {}
	})

	await test.context.flush(test.context.session, 1)
	const deleteResult = await test.context.queue.producer.waitResults(
		test.context.context, deleteRequest)
	test.false(deleteResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, deleteResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: deleteResult.data.id,
		name: null,
		version: '1.0.0',
		slug: 'foo',
		type: 'card@1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should delete a card using action-update-card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		name: null,
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should post an error execute event if logging in as a disallowed user', async (test) => {
	const adminCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin@latest')

	await test.throwsAsync(
		test.context.worker.pre(test.context.session, {
			action: 'action-create-session@1.0.0',
			context: test.context.context,
			card: adminCard.id,
			type: adminCard.type,
			arguments: {
				password: 'foobarbaz'
			}
		}), {
			instanceOf: test.context.worker.errors.WorkerAuthenticationError
		})
})

ava('action-create-event should create a link card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	const cardRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {}
		}
	})

	await test.context.flush(test.context.session, 1)
	const cardResult = await test.context.queue.producer.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
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

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const [ link ] = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'link@1.0.0'
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
		type: 'link@1.0.0',
		data: {
			inverseName: 'has attached element',
			from: {
				id: messageResult.data.id,
				type: 'message@1.0.0'
			},
			to: {
				id: cardResult.data.id,
				type: 'card@1.0.0'
			}
		}
	}))
})

ava('action-create-event: should be able to add an event name', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	const cardRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {}
		}
	})

	await test.context.flush(test.context.session, 1)
	const cardResult = await test.context.queue.producer.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		context: test.context.context,
		card: cardResult.data.id,
		type: cardResult.data.type,
		arguments: {
			type: 'message',
			name: 'Hello world',
			tags: [],
			payload: {
				message: 'johndoe'
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const event = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, messageResult.data.id, {
			type: messageResult.data.type
		})

	test.is(event.name, 'Hello world')
})

ava('events should always inherit their parent\'s markers', async (test) => {
	const {
		context,
		jellyfish,
		session
	} = test.context

	const marker = 'org-test'
	const typeCard = await jellyfish.getCardBySlug(
		context, session, 'card@latest', {
			type: 'type'
		})

	const cardRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					markers: [ marker ]
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const cardResult = await test.context.queue.producer.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-create-event@1.0.0',
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

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, messageResult.data.id, {
			type: messageResult.data.type
		})

	test.deepEqual(card.markers, [ marker ])
})

ava('Updating a cards markers should update the markers of attached events', async (test) => {
	const {
		context,
		jellyfish,
		session
	} = test.context
	const marker = 'org-test'
	const typeCard = await jellyfish.getCardBySlug(
		context, session, 'card@latest', {
			type: 'type'
		})

	const cardRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {}
			}
		})

	await test.context.flush(test.context.session, 1)
	const cardResult = await test.context.queue.producer.waitResults(
		test.context.context, cardRequest)
	test.false(cardResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-create-event@1.0.0',
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
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: cardResult.data.id,
			type: cardResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/markers',
						value: [ marker ]
					}
				]
			}
		})

	await test.context.flush(session)
	await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)

	const message = await jellyfish.getCardById(
		context, session, messageResult.data.id)

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

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo',
				version: '1.0.0',
				data
			}
		}
	})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, createResult.data.id, {
			type: createResult.data.type
		})

	test.deepEqual(card.slug, 'foo')
	test.deepEqual(card.version, '1.0.0')
	test.deepEqual(card.data, data)
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

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {}
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/test',
						value: 1
					}
				]
			}
		})

	await test.context.flush(test.context.session, 1)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id, {
			type: updateResult.data.type
		})

	test.deepEqual(card.slug, 'foo')
	test.deepEqual(card.version, '1.0.0')
	test.deepEqual(card.data, data)
})

ava('should post a broadcast message to an empty thread', async (test) => {
	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card@1.0.0',
			version: '1.0.0',
			slug: 'thread-1',
			data: {}
		})

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const threadWithLinks = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id', 'type' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: thread.id
				},
				type: {
					type: 'string',
					const: thread.type
				},
				links: {
					type: 'object'
				}
			}
		})

	const timeline = threadWithLinks[0].links['has attached element']

	test.deepEqual(_.map(timeline, (card) => {
		return _.pick(card, [ 'type', 'slug', 'data' ])
	}), [
		{
			type: 'message@1.0.0',
			slug: result.data.slug,
			data: {
				actor: timeline[0].data.actor,
				timestamp: timeline[0].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test'
				}
			}
		}
	])
})

ava('should post a broadcast message to a non empty thread', async (test) => {
	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card@1.0.0',
			version: '1.0.0',
			slug: 'thread-1',
			data: {}
		})

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(),
		test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: thread.id,
			type: thread.type,
			arguments: {
				type: 'message',
				payload: {
					message: 'Foo'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const threadWithLinks = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id', 'type' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: thread.id
				},
				type: {
					type: 'string',
					const: thread.type
				},
				links: {
					type: 'object'
				}
			}
		})

	const timeline = threadWithLinks[0].links['has attached element']

	const sortedTimeline = _.map(_.sortBy(timeline, (card) => {
		return card.data.timestamp
	}), (card) => {
		return _.pick(card, [ 'type', 'slug', 'data' ])
	})

	test.deepEqual(sortedTimeline, [
		{
			type: 'message@1.0.0',
			slug: sortedTimeline[0].slug,
			data: {
				actor: sortedTimeline[0].data.actor,
				timestamp: sortedTimeline[0].data.timestamp,
				target: thread.id,
				payload: {
					message: 'Foo'
				}
			}
		},
		{
			type: 'message@1.0.0',
			slug: result.data.slug,
			data: {
				actor: sortedTimeline[1].data.actor,
				timestamp: sortedTimeline[1].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test'
				}
			}
		}
	])
})

ava('should not broadcast the same message twice', async (test) => {
	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card@1.0.0',
			version: '1.0.0',
			slug: 'thread-1',
			data: {}
		})

	const request1 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result1 = await test.context.queue.producer.waitResults(
		test.context.context, request1)
	test.false(result1.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(),
		test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: thread.id,
			type: thread.type,
			arguments: {
				type: 'message',
				payload: {
					message: 'Foo'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const request2 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result2 = await test.context.queue.producer.waitResults(
		test.context.context, request2)
	test.false(result2.error)

	const threadWithLinks = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id', 'type' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: thread.id
				},
				type: {
					type: 'string',
					const: thread.type
				},
				links: {
					type: 'object'
				}
			}
		})

	const timeline = threadWithLinks[0].links['has attached element']

	const sortedTimeline = _.map(_.sortBy(timeline, (card) => {
		return card.data.timestamp
	}), (card) => {
		return _.pick(card, [ 'type', 'slug', 'data' ])
	})

	test.deepEqual(sortedTimeline, [
		{
			type: 'message@1.0.0',
			slug: result1.data.slug,
			data: {
				actor: sortedTimeline[0].data.actor,
				timestamp: sortedTimeline[0].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test'
				}
			}
		},
		{
			type: 'message@1.0.0',
			slug: sortedTimeline[1].slug,
			data: {
				actor: sortedTimeline[1].data.actor,
				timestamp: sortedTimeline[1].data.timestamp,
				target: thread.id,
				payload: {
					message: 'Foo'
				}
			}
		}
	])
})

ava('should broadcast different messages', async (test) => {
	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card@1.0.0',
			version: '1.0.0',
			slug: 'thread-1',
			data: {}
		})

	const request1 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test 1'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result1 = await test.context.queue.producer.waitResults(
		test.context.context, request1)
	test.false(result1.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(),
		test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: thread.id,
			type: thread.type,
			arguments: {
				type: 'message',
				payload: {
					message: 'Foo'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const request2 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test 2'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result2 = await test.context.queue.producer.waitResults(
		test.context.context, request2)
	test.false(result2.error)

	const threadWithLinks = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id', 'type' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: thread.id
				},
				type: {
					type: 'string',
					const: thread.type
				},
				links: {
					type: 'object'
				}
			}
		})

	const timeline = threadWithLinks[0].links['has attached element']

	const sortedTimeline = _.map(_.sortBy(timeline, (card) => {
		return card.data.timestamp
	}), (card) => {
		return _.pick(card, [ 'type', 'slug', 'data' ])
	})

	test.deepEqual(sortedTimeline, [
		{
			type: 'message@1.0.0',
			slug: result1.data.slug,
			data: {
				actor: sortedTimeline[0].data.actor,
				timestamp: sortedTimeline[0].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test 1'
				}
			}
		},
		{
			type: 'message@1.0.0',
			slug: sortedTimeline[1].slug,
			data: {
				actor: sortedTimeline[1].data.actor,
				timestamp: sortedTimeline[1].data.timestamp,
				target: thread.id,
				payload: {
					message: 'Foo'
				}
			}
		},
		{
			type: 'message@1.0.0',
			slug: result2.data.slug,
			data: {
				actor: sortedTimeline[2].data.actor,
				timestamp: sortedTimeline[2].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test 2'
				}
			}
		}
	])
})

ava('should broadcast the same message twice given different actors', async (test) => {
	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card@1.0.0',
			version: '1.0.0',
			slug: 'thread-1',
			data: {}
		})

	const rogueUser = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'user@1.0.0',
			version: '1.0.0',
			slug: 'user-admin-fake-test',
			data: {
				email: 'accounts+jellyfish@resin.io',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	const rogueSession = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session@1.0.0',
			version: '1.0.0',
			slug: 'session-rogue-user-test',
			data: {
				actor: rogueUser.id
			}
		})

	const request1 = await test.context.queue.producer.enqueue(test.context.worker.getId(),
		rogueSession.id, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: thread.id,
			type: thread.type,
			arguments: {
				type: 'message',
				payload: {
					message: 'Broadcast test'
				}
			}
		})

	await test.context.flush(test.context.session, 1)
	const result1 = await test.context.queue.producer.waitResults(
		test.context.context, request1)
	test.false(result1.error)

	const request2 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-broadcast@1.0.0',
			card: thread.id,
			type: thread.type,
			context: test.context.context,
			arguments: {
				message: 'Broadcast test'
			}
		})

	await test.context.flush(test.context.session, 1)
	const result2 = await test.context.queue.producer.waitResults(
		test.context.context, request2)
	test.false(result2.error)

	const threadWithLinks = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'id', 'type' ],
			additionalProperties: true,
			properties: {
				id: {
					type: 'string',
					const: thread.id
				},
				type: {
					type: 'string',
					const: thread.type
				},
				links: {
					type: 'object'
				}
			}
		})

	const timeline = threadWithLinks[0].links['has attached element']

	const sortedTimeline = _.map(_.sortBy(timeline, (card) => {
		return card.data.timestamp
	}), (card) => {
		return _.pick(card, [ 'type', 'slug', 'data' ])
	})

	test.deepEqual(sortedTimeline, [
		{
			type: 'message@1.0.0',
			slug: result1.data.slug,
			data: {
				actor: sortedTimeline[0].data.actor,
				timestamp: sortedTimeline[0].data.timestamp,
				target: thread.id,
				payload: {
					message: 'Broadcast test'
				}
			}
		},
		{
			type: 'message@1.0.0',
			slug: result2.data.slug,
			data: {
				actor: sortedTimeline[1].data.actor,
				timestamp: sortedTimeline[1].data.timestamp,
				target: thread.id,
				payload: {
					alertsUser: [],
					mentionsUser: [],
					message: 'Broadcast test'
				}
			}
		}
	])
})
