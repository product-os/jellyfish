/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const ava = require('ava')
const errors = require('../../../lib/queue/errors')
const helpers = require('./helpers')

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

ava('.dequeue() should return nothing if no requests', async (test) => {
	const request = await test.context.dequeue()
	test.falsy(request)
})

ava('.enqueue() should include the actor from the passed session', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	await test.context.queue.producer.enqueue(test.context.queueActor, test.context.session, {
		action: 'action-create-card@1.0.0',
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

	const request = await test.context.dequeue()
	test.is(session.data.actor, request.data.actor)
})

ava('.enqueue() should include the whole passed action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')
	await test.context.queue.producer.enqueue(test.context.queueActor, test.context.session, {
		action: 'action-create-card@1.0.0',
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

	const request = await test.context.dequeue()
	test.deepEqual(request.data.action, `${actionCard.slug}@${actionCard.version}`)
})

ava('.enqueue() should set an originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	await test.context.queue.producer.enqueue(test.context.queueActor, test.context.session, {
		action: 'action-create-card@1.0.0',
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

	const request = await test.context.dequeue()
	test.is(request.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

ava('.enqueue() should take a current date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const date = new Date()

	await test.context.queue.producer.enqueue(test.context.queueActor, test.context.session, {
		action: 'action-create-card@1.0.0',
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

	const dequeue = async (times = 10) => {
		const request = await test.context.dequeue()
		if (request) {
			return request
		}

		if (times <= 0) {
			throw new Error('Didn\'t dequeue in time')
		}

		await Bluebird.delay(100)
		return dequeue(times - 1)
	}

	const request = await dequeue()
	test.is(request.data.timestamp, date.toISOString())
})

ava('.dequeue() should not let the same owner take a request twice', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionRequest = await test.context.queue.producer.enqueue(
		test.context.queueActor, test.context.session, {
			action: 'action-create-card@1.0.0',
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

	const request1 = await test.context.dequeue()
	test.truthy(request1)
	test.is(request1.slug, actionRequest.slug)

	const request2 = await test.context.dequeue()

	test.falsy(request2)
})

ava('.enqueue() should set a present timestamp', async (test) => {
	const currentDate = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	await test.context.queue.producer.enqueue(test.context.queueActor, test.context.session, {
		action: 'action-create-card@1.0.0',
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

	const request = await test.context.dequeue()
	test.true(new Date(request.data.timestamp) >= currentDate)
})

ava('.enqueue() should throw if the type is a slug and was not found', async (test) => {
	await test.throwsAsync(test.context.queue.producer.enqueue(
		test.context.queueActor, test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: 'foo-bar-baz-qux',
			type: 'type',
			arguments: {
				properties: {
					version: '1.0.0',
					slug: 'foo',
					data: {
						foo: 'bar'
					}
				}
			}
		}), {
		instanceOf: errors.QueueInvalidRequest
	})
})

ava('.enqueue() should throw if the action was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	await test.throwsAsync(test.context.queue.producer.enqueue(
		test.context.queueActor, test.context.session, {
			action: 'action-foo-bar@1.0.0',
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
		}), {
		instanceOf: errors.QueueInvalidAction
	})
})

ava('.enqueue() should throw if the session was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
	await test.throwsAsync(test.context.queue.producer.enqueue(test.context.queueActor, id, {
		action: 'action-create-card@1.0.0',
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
	}), {
		instanceOf: test.context.jellyfish.errors.JellyfishInvalidSession
	})
})

ava('.dequeue() should cope with link materialization failures', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')

	const actionRequest = await test.context.queue.producer.enqueue(
		test.context.queueActor, test.context.session, {
			action: 'action-create-card@1.0.0',
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

	await test.context.queue.consumer.postResults(
		test.context.queueActor, test.context.context, test.context.redisClient, actionRequest, {
			error: false,
			data: {
				foo: 'true'
			}
		})

	// Simulate non-materialized links
	await test.context.backend.upsertElement(
		test.context.context, Object.assign({}, actionRequest, {
			links: {}
		}))

	const currentRequest = await test.context.jellyfish.getCardBySlug(
		test.context.context,
		test.context.session, `${actionRequest.slug}@${actionRequest.version}`)

	test.deepEqual(currentRequest.links, {})
})
