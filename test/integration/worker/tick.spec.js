/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-bar',
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
			slug: 'triggered-action-foo-baz',
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
