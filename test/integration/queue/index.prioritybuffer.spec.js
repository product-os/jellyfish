/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const Bluebird = require('bluebird')
const helpers = require('./helpers')

ava.beforeEach(async (test) => {
	await helpers.queue.beforeEach(test, {
		enablePriorityBuffer: true
	})
})

ava.afterEach(helpers.queue.afterEach)

const insertRequest = async (test) => {
	return test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request',
			slug: test.context.generateRandomSlug({
				prefix: 'action-request'
			}),
			version: '1.0.0',
			data: {
				context: test.context.context,
				action: 'action-delete-card',
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				epoch: 1521170969543,
				timestamp: '2018-03-16T03:29:29.543Z',
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					type: 'card'
				},
				arguments: {}
			}
		})
}

ava('should add a new action request to the priority buffer', async (test) => {
	const request = await insertRequest(test)
	const wait = async (times = 20) => {
		if (test.context.queue.priority.length > 0) {
			return
		}

		if (times <= 0) {
			throw new Error('The priority queue remains empty')
		}

		await Bluebird.delay(50)
		await wait(times - 1)
	}

	await wait()
	test.deepEqual(test.context.queue.priority, [ request ])
})

ava('should not add more than 10 requests', async (test) => {
	const request1 = await insertRequest(test)
	const request2 = await insertRequest(test)
	const request3 = await insertRequest(test)
	const request4 = await insertRequest(test)
	const request5 = await insertRequest(test)
	const request6 = await insertRequest(test)
	const request7 = await insertRequest(test)
	const request8 = await insertRequest(test)
	const request9 = await insertRequest(test)
	const request10 = await insertRequest(test)

	const wait = async (times = 20) => {
		if (test.context.queue.priority.length >= 10) {
			return
		}

		if (times <= 0) {
			throw new Error('The priority queue remains empty')
		}

		await Bluebird.delay(50)
		await wait(times - 1)
	}

	await wait()

	test.deepEqual(test.context.queue.priority, [
		request1,
		request2,
		request3,
		request4,
		request5,
		request6,
		request7,
		request8,
		request9,
		request10
	])

	const request11 = await insertRequest(test)
	const request12 = await insertRequest(test)

	await Bluebird.delay(800)

	const waitForTail = async (slug, times = 20) => {
		if (_.last(test.context.queue.priority).slug === slug) {
			return
		}

		if (times <= 0) {
			throw new Error('The priority queue tail remains different')
		}

		await Bluebird.delay(50)
		await waitForTail(slug, times - 1)
	}

	await waitForTail(request12.slug)

	test.deepEqual(test.context.queue.priority, [
		request3,
		request4,
		request5,
		request6,
		request7,
		request8,
		request9,
		request10,
		request11,
		request12
	])
})
