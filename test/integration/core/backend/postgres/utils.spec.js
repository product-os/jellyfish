/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const utils = require('../../../../../lib/core/backend/postgres/utils')
const helpers = require('../../helpers')

ava.beforeEach(helpers.backend.beforeEach)
ava.afterEach(helpers.backend.afterEach)

ava('.getPendingRequests() should return nothing by default', async (test) => {
	const result = await utils.getPendingRequests(
		test.context.context, test.context.backend)
	test.deepEqual(result, [])
})

ava('.getPendingRequests() should return an unexecuted action request', async (test) => {
	const date = new Date()
	const request = await test.context.backend.insertElement(
		test.context.context, {
			type: 'action-request',
			created_at: date.toISOString(),
			updated_at: null,
			linked_at: {},
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'request-1',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card'
				},
				arguments: {}
			}
		})

	const wait = async (length, times = 3) => {
		const requests = await utils.getPendingRequests(
			test.context.context, test.context.backend)
		if (requests.length >= length) {
			return requests
		}

		if (times > 0) {
			await Bluebird.delay(100)
			return wait(length, times - 1)
		}

		return requests
	}

	const result = await wait(1)
	test.deepEqual(result, [ request ])
})

ava('.getPendingRequests() should return two unexecuted action requests', async (test) => {
	const date = new Date()
	const request1 = await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-1',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	const request2 = await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-2',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	const wait = async (length, times = 3) => {
		const requests = await utils.getPendingRequests(
			test.context.context, test.context.backend)
		if (requests.length >= length) {
			return requests
		}

		if (times > 0) {
			await Bluebird.delay(100)
			return wait(length, times - 1)
		}

		return requests
	}

	const result = await wait(2)
	test.deepEqual(_.sortBy(result, 'slug'), _.sortBy([ request1, request2 ], 'slug'))
})

ava('.getPendingRequests() should be able to limit', async (test) => {
	const date = new Date()
	await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-1',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		version: '1.0.0',
		active: true,
		linked_at: {},
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-2',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	const wait = async (length, times = 3) => {
		const requests = await utils.getPendingRequests(
			test.context.context, test.context.backend)
		if (requests.length >= length) {
			return requests
		}

		if (times > 0) {
			await Bluebird.delay(100)
			return wait(length, times - 1)
		}

		throw new Error(`Didn't get ${length} requests in time`)
	}

	await wait(2)

	const result1 = await utils.getPendingRequests(
		test.context.context, test.context.backend, {
			limit: 1
		})

	test.is(result1.length, 1)

	const result2 = await utils.getPendingRequests(
		test.context.context, test.context.backend, {
			limit: 1,
			skip: 1
		})

	test.is(result2.length, 1)
	test.not(result1[0].slug, result2[0].slug)
})

ava('.getPendingRequests() should be able to skip', async (test) => {
	const date = new Date()
	await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-1',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-2',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	const wait = async (length, times = 3) => {
		const requests = await utils.getPendingRequests(
			test.context.context, test.context.backend)
		if (requests.length >= length) {
			return requests
		}

		if (times > 0) {
			await Bluebird.delay(100)
			return wait(length, times - 1)
		}

		throw new Error(`Didn't get ${length} requests in time`)
	}

	await wait(1)

	const result1 = await utils.getPendingRequests(
		test.context.context, test.context.backend, {
			skip: 1
		})

	test.is(result1.length, 1)

	const result2 = await utils.getPendingRequests(
		test.context.context, test.context.backend, {
			skip: 0,
			limit: 1
		})

	test.is(result2.length, 1)
	test.not(result1[0].slug, result2[0].slug)
})

ava('.getPendingRequests() should omit an executed action request', async (test) => {
	const date = new Date()
	const request = await test.context.backend.insertElement(test.context.context, {
		type: 'action-request',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		version: '1.0.0',
		active: true,
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		slug: 'request-1',
		data: {
			epoch: date.valueOf(),
			timestamp: date.toISOString(),
			context: test.context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: 'action-foo',
			input: {
				id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				type: 'card'
			},
			arguments: {}
		}
	})

	const execute = await test.context.backend.insertElement(test.context.context, {
		type: 'execute',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		slug: `execute-${request.id}`,
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			timestamp: date.toISOString(),
			target: request.id,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			payload: {
				action: 'action-foo',
				card: '98853c0c-d055-4d25-a7be-682a2d5decc5',
				timestamp: date.toISOString(),
				error: false,
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.backend.insertElement(test.context.context, {
		type: 'link',
		name: 'executes',
		created_at: date.toISOString(),
		updated_at: null,
		linked_at: {},
		slug: `link-${request.id}-${execute.id}`,
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			inverseName: 'is executed by',
			from: {
				id: execute.id,
				type: execute.type
			},
			to: {
				id: request.id,
				type: request.type
			}
		}
	})

	const wait = async (times = 3) => {
		const requests = await utils.getPendingRequests(
			test.context.context, test.context.backend)
		if (requests.length === 0) {
			return requests
		}

		if (times > 0) {
			await Bluebird.delay(100)
			return wait(times - 1)
		}

		throw new Error('The queue did not get empty in time')
	}

	await wait()

	const result = await utils.getPendingRequests(
		test.context.context, test.context.backend)
	test.deepEqual(result, [])
})
