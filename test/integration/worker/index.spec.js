/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const _ = require('lodash')
const Bluebird = require('bluebird')
const actionLibrary = require('../../../lib/action-library')
const Worker = require('../../../lib/worker')
const uuid = require('../../../lib/uuid')

ava.serial.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.serial.afterEach(helpers.worker.afterEach)

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
		await uuid.random(), test.context.context, test.context.redisClient, enqueuedRequest1, {
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
		await uuid.random(), test.context.context, test.context.redisClient, enqueuedRequest1, {
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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
		test.context.flush(test.context.session),
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
		test.context.flush(test.context.session),
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
		test.context.flush(test.context.session),
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

	await test.context.flush(test.context.session)
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
			slug: 'triggered-action-foo-bar',
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

	await test.context.flush(test.context.session)
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
			slug: 'triggered-action-foo-bar',
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

	await test.context.flush(test.context.session)
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
			slug: 'triggered-action-foo-bar',
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

ava('trigger should update card if triggered by a user not owning the card', async (test) => {
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
			slug: 'triggered-action-foo-bar',
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

	await test.context.flush(sessionIdOfJohnDoe)
	const result = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, card.id)
	test.truthy(result)
	test.true(result.data.updated)
})

ava('.getTriggers() should initially be an empty array', (test) => {
	const triggers = test.context.worker.getTriggers()
	test.deepEqual(triggers, [])
})
