/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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
			slug: 'session-rogue-user-test'
		})
	await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: test.context.generateRandomSlug({
				prefix: 'link'
			}),
			type: 'link@1.0.0',
			name: 'is owned by',
			data: {
				inverseName: 'owns',
				from: {
					id: rogueSession.id,
					type: rogueSession.type
				},
				to: {
					id: rogueUser.id,
					type: rogueUser.type
				}
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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
