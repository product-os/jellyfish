/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(helpers.worker.after)

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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
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

	await test.context.flush(test.context.session)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, messageResult.data.id, {
			type: messageResult.data.type
		})

	test.deepEqual(card.markers, [ marker ])
})
