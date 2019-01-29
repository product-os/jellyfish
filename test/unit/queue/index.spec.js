/*
 * Copyright 2019 resin.io
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

const uuid = require('uuid/v4')
const ava = require('ava')
const errors = require('../../../lib/queue/errors')
const helpers = require('./helpers')

ava.beforeEach(async (test) => {
	await helpers.queue.beforeEach(test)
	test.context.queueActor = uuid()
})

ava.afterEach(helpers.queue.afterEach)

ava('.dequeue() should return nothing if no requests', async (test) => {
	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.falsy(request)
})

ava('.enqueue() should include the actor from the passed session', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.is(session.data.actor, request.data.actor)
})

ava('.enqueue() should include the whole passed action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.deepEqual(request.data.action, actionCard.slug)
})

ava('.enqueue() should set an originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.is(request.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

ava('.enqueue() should take a current date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const date = new Date()

	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.is(request.data.timestamp, date.toISOString())
})

ava('.enqueue() should set a present timestamp', async (test) => {
	const currentDate = new Date()
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.true(new Date(request.data.timestamp) >= currentDate)
})

ava('.enqueue() should throw if the action was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	await test.throwsAsync(test.context.queue.enqueue(
		test.context.queueActor, test.context.session, {
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
		}), errors.QueueInvalidAction)
})

ava('.enqueue() should throw if the session was not found', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
	await test.throwsAsync(test.context.queue.enqueue(test.context.queueActor, id, {
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
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user')
	await test.context.queue.enqueue(test.context.queueActor, test.context.session, {
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

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.falsy(request.data.arguments.hash.string)
	test.falsy(request.data.arguments.hash.salt)
})

ava('.dequeue() should self heal broken execute links', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')

	const actionRequest = await test.context.queue.enqueue(
		test.context.queueActor, test.context.session, {
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

	const eventCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, test.context.jellyfish.defaults({
			slug: `execute-${actionRequest.id}`,
			type: 'execute',
			data: {
				timestamp: '2019-01-29T19:53:34.158Z',
				target: 'd6d6487d-49a2-483d-9466-59cd094a0c04',
				actor: '678a9dc9-e35a-4de0-b611-22078f55164a',
				payload: {
					action: 'action-create-card',
					card: 'd0ee68b6-c113-43be-9c45-77d543556a5d',
					timestamp: '2019-01-29T19:53:34.137Z',
					error: false,
					data: {
						foo: true
					}
				}
			}
		}))

	const currentRequest = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, actionRequest.slug, {
			type: actionRequest.type
		})

	test.deepEqual(currentRequest.links, {})

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.falsy(request)

	const updatedRequest = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, actionRequest.slug, {
			type: actionRequest.type
		})

	test.deepEqual(updatedRequest.links, {
		'is executed by': [
			{
				$link: updatedRequest.links['is executed by'][0].$link,
				id: eventCard.id,
				slug: eventCard.slug,
				type: eventCard.type
			}
		]
	})
})

ava('.dequeue() should cope with link materialization failures', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')

	const actionRequest = await test.context.queue.enqueue(
		test.context.queueActor, test.context.session, {
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

	await test.context.queue.postResults(
		test.context.queueActor, test.context.context, actionRequest, {
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
		test.context.context, test.context.session, actionRequest.slug, {
			type: actionRequest.type
		})

	test.deepEqual(currentRequest.links, {})

	const request = await test.context.queue.dequeue(
		test.context.context, test.context.queueActor)
	test.falsy(request)
})
