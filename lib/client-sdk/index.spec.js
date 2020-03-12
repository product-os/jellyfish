/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const uuid = require('uuid/v4')
const {
	getSdk
} = require('./index')

const nock = require('nock')

const API_URL = 'https://test.ly.fish'

ava.serial.before(async (test) => {
	test.context.sdk = getSdk({
		apiPrefix: 'api/v2',
		apiUrl: API_URL
	})

	test.context.token = 'foobar'

	test.context.executeThenWait = async (asyncFn, waitQuery, times = 20) => {
		if (times === 0) {
			throw new Error('The wait query did not resolve')
		}

		if (asyncFn) {
			await asyncFn()
		}

		const results = await test.context.sdk.query(waitQuery)
		if (results.length > 0) {
			return results[0]
		}

		await Bluebird.delay(1000)
		return test.context.executeThenWait(null, waitQuery, times - 1)
	}
})

ava.serial.beforeEach((test) => {
	nock.cleanAll()
	test.context.sdk.setAuthToken(test.context.token)
})

ava.serial.afterEach((test) => {
	test.context.sdk.cancelAllStreams()
	test.context.sdk.cancelAllRequests()
})

ava.serial('.action() should send an action to the server', async (test) => {
	const {
		sdk
	} = test.context

	const name = `test-card-${uuid()}`

	const server = nock(API_URL)

	server.post(/action/)
		.reply((uri, requestBody) => {
			const expected = {
				card: 'card@1.0.0',
				type: 'type@1.0.0',
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					properties: {
						version: '1.0.0',
						name
					}
				}
			}

			if (!_.isEqual(JSON.parse(requestBody), expected)) {
				return [ 500, 'test error' ]
			}

			return [
				200,
				{
					error: false,
					timestamp: '2020-01-07T14:52:02.070Z',
					data: {
						id: '37a55e52-23fb-4122-8d4e-319827232278',
						slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
						type: 'thread@1.0.0',
						version: '1.0.0'
					}
				}
			]
		})

	const actionResult = await sdk.action({
		card: 'card@1.0.0',
		type: 'type@1.0.0',
		action: 'action-create-card@1.0.0',
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				name
			}
		}
	})

	test.deepEqual(actionResult, {
		id: '37a55e52-23fb-4122-8d4e-319827232278',
		slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
		type: 'thread@1.0.0',
		version: '1.0.0'
	})
})

ava.serial('.query() should send a query to the server', async (test) => {
	const {
		sdk
	} = test.context

	const name = `test-card-${uuid()}`

	const server = nock(API_URL)

	const mockData = {
		id: '37a55e52-23fb-4122-8d4e-319827232278',
		slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
		type: 'card@1.0.0',
		active: true,
		version: '1.0.0',
		name,
		tags: [],
		markers: [],
		created_at: '2020-01-07T14:52:02.182Z',
		links: {},
		requires: [],
		capabilities: [],
		data: {},
		updated_at: null,
		linked_at: {
			'has attached element': '2020-01-07T14:52:02.245Z'
		}
	}

	server.post(/query/)
		.reply((uri, requestBody) => {
			const expected = {
				query: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
							const: name
						},
						type: {
							type: 'string',
							const: 'card@1.0.0'
						}
					},
					required: [ 'name', 'type' ],
					additionalProperties: true
				},
				options: {
					limit: 1,
					skip: 0,
					sortBy: 'created_at'
				}
			}

			if (!_.isEqual(JSON.parse(requestBody), expected)) {
				return [ 500, 'test error' ]
			}

			return [
				200,
				{
					error: false,
					data: [ mockData ]
				}
			]
		})

	const results = await sdk.query({
		type: 'object',
		properties: {
			name: {
				type: 'string',
				const: name
			},
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'name', 'type' ],
		additionalProperties: true
	}, {
		limit: 1,
		skip: 0,
		sortBy: 'created_at'
	})

	test.deepEqual(results[0], mockData)
})

ava.serial('.card.get() should work for ids', async (test) => {
	const {
		sdk
	} = test.context

	const name = `test-card-${uuid()}`
	const id = '37a55e52-23fb-4122-8d4e-319827232278'

	const mockData = {
		id,
		slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
		type: 'card@1.0.0',
		active: true,
		version: '1.0.0',
		name,
		tags: [],
		markers: [],
		created_at: '2020-01-07T14:52:02.182Z',
		links: {},
		requires: [],
		capabilities: [],
		data: {},
		updated_at: null,
		linked_at: {
			'has attached element': '2020-01-07T14:52:02.245Z'
		}
	}

	const server = nock(API_URL)

	server.get(new RegExp(`id/${id}`))
		.reply((uri, requestBody) => {
			return [
				200,
				mockData
			]
		})

	const result = await sdk.card.get(id)

	test.deepEqual(result, mockData)
})

ava.serial('.card.get() should work for slugs', async (test) => {
	const {
		sdk
	} = test.context

	const name = `test-card-${uuid()}`
	const slug = 'test-card-37a55e52-23fb-4122-8d4e-319827232278'

	const mockData = {
		id: '37a55e52-23fb-4122-8d4e-319827232278',
		slug,
		type: 'card@1.0.0',
		active: true,
		version: '1.0.0',
		name,
		tags: [],
		markers: [],
		created_at: '2020-01-07T14:52:02.182Z',
		links: {},
		requires: [],
		capabilities: [],
		data: {},
		updated_at: null,
		linked_at: {
			'has attached element': '2020-01-07T14:52:02.245Z'
		}
	}

	const server = nock(API_URL)

	server.get(new RegExp(`slug/${slug}`))
		.reply((uri, requestBody) => {
			return [
				200,
				mockData
			]
		})

	const result = await sdk.card.get(slug)

	test.deepEqual(result, mockData)
})

ava.serial('.card.create() should create a new card', async (test) => {
	const {
		sdk
	} = test.context

	const server = nock(API_URL)

	server.post(/action/)
		.reply((uri, requestBody) => {
			const expected = {
				card: 'card@1.0.0',
				type: 'type',
				action: 'action-create-card@1.0.0',
				arguments: {
					reason: null,
					properties: {
						linked_at: {}
					}
				}
			}

			if (!_.isEqual(JSON.parse(requestBody), expected)) {
				return [ 500, 'test error' ]
			}

			return [
				200,
				{
					error: false,
					timestamp: '2020-01-07T14:52:02.070Z',
					data: {
						id: '37a55e52-23fb-4122-8d4e-319827232278',
						slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
						type: 'card@1.0.0',
						version: '1.0.0'
					}
				}
			]
		})

	const actionResult = await sdk.card.create({
		type: 'card@1.0.0'
	})

	test.deepEqual(actionResult, {
		id: '37a55e52-23fb-4122-8d4e-319827232278',
		slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
		type: 'card@1.0.0',
		version: '1.0.0'
	})
})

ava.serial('.event.create() should create a new event', async (test) => {
	const {
		sdk
	} = test.context

	const event = {
		target: {
			id: '37a55e52-23fb-4122-8d4e-319827232278',
			slug: 'card-fe9e8f22-d656-4a21-aa35-81f4dfd13b2b',
			type: 'card@1.0.0'
		},
		type: 'message',
		payload: {
			message: 'Foo',
			test: 1
		}
	}

	const server = nock(API_URL)

	server.post(/action/)
		.reply((uri, requestBody) => {
			const expected = {
				card: '37a55e52-23fb-4122-8d4e-319827232278',
				type: 'card@1.0.0',
				action: 'action-create-event@1.0.0',
				arguments: {
					payload: {
						message: 'Foo', test: 1
					},
					tags: [],
					type: 'message'
				}
			}

			if (!_.isEqual(JSON.parse(requestBody), expected)) {
				return [ 500, 'test error' ]
			}

			return [
				200,
				{
					error: false,
					timestamp: '2020-01-07T15:43:13.647Z',
					data: {
						id: '0de621b6-db40-432d-8f81-9c51c28f19f8',
						slug: 'message-2fa527ba-aa63-47d2-9386-ce02224b6e45',
						type: 'message@1.0.0',
						version: '1.0.0'
					}
				}
			]
		})

	const result = await sdk.event.create(event)

	test.deepEqual(result, {
		id: '0de621b6-db40-432d-8f81-9c51c28f19f8',
		slug: 'message-2fa527ba-aa63-47d2-9386-ce02224b6e45',
		type: 'message@1.0.0',
		version: '1.0.0'
	})
})

ava.serial('.view() should query using a view template', async (test) => {
	const {
		sdk
	} = test.context

	const server = nock(API_URL)

	const mockData = {
		example: 'card'
	}

	server.post(/view\/view-all-by-type@1.0.0/)
		.reply((uri, requestBody) => {
			const expected = {
				params: {
					types: [ 'view', 'view@1.0.0' ]
				},
				options: {
					limit: 1,
					skip: 0,
					sortBy: 'created_at'
				}
			}

			if (!_.isEqual(JSON.parse(requestBody), expected)) {
				return [ 500, 'test error' ]
			}

			return [
				200,
				{
					error: false,
					data: [ mockData ]
				}
			]
		})

	const results = await sdk.view('view-all-by-type@1.0.0', {
		types: [ 'view', 'view@1.0.0' ]
	}, {
		limit: 1,
		skip: 0,
		sortBy: 'created_at'
	})

	test.deepEqual(results[0], mockData)
})
