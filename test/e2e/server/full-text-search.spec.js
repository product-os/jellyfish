/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('../sdk/helpers')
const uuid = require('uuid/v4')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

ava.serial.before(async (test) => {
	// Create support-thread card to execute full-text search tests against.
	test.context.supportThread = await test.context.sdk.card.create({
		slug: `support-thread-test-${uuid()}`,
		type: 'support-thread',
		version: '1.0.0',
		name: 'Who controls the past controls the future.',
		tags: [
			'foo',
			'bar'
		],
		data: {
			status: 'open',
			category: 'security',
			description: 'Perhaps a lunatic was simply a minority of one.',
			environment: 'production',
			statusDescription: 'in-progress',
			inbox: 'my-inbox',
			tags: [
				'baz',
				'buz'
			]
		}
	})

	// Create message card to execute full-text search tests against.
	test.context.message = await test.context.sdk.action({
		card: test.context.supportThread.id,
		type: test.context.supportThread.type,
		action: 'action-create-event@1.0.0',
		arguments: {
			type: 'message',
			slug: `message-test-${uuid()}`,
			payload: {
				message: 'Who controls the past controls the future.'
			}
		}
	})
})

const executeSearch = (test, type, anyOf) => {
	return test.context.http(
		'POST',
		'/api/v2/query',
		{
			query: {
				type: 'object',
				additionalProperties: true,
				required: [
					'active',
					'type'
				],
				anyOf,
				properties: {
					type: {
						type: 'string',
						const: `${type}@1.0.0`
					},
					active: {
						type: 'boolean',
						const: true
					}
				}
			},
			options: {
				limit: 100
			}
		},
		{
			Authorization: `Bearer ${test.context.token}`
		}
	)
}

ava.serial('full-text search should match queries for card root-level string fields', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					name: {
						type: 'string',
						fullTextSearch: {
							term: 'control past'
						}
					}
				},
				required: [
					'name'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should match queries for card root-level array fields', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					tags: {
						type: 'array',
						fullTextSearch: {
							term: 'foo'
						}
					}
				},
				required: [
					'tags'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should match queries for card data->string fields', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'category'
						],
						properties: {
							category: {
								type: 'string',
								fullTextSearch: {
									term: 'security'
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should match queries for card data->array fields', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'tags'
						],
						properties: {
							tags: {
								type: 'array',
								fullTextSearch: {
									term: 'buz'
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should match queries for card data->object->string fields', async (test) => {
	const result = await executeSearch(test, 'message',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'payload'
						],
						properties: {
							type: 'object',
							required: [
								'message'
							],
							payload: {
								properties: {
									message: {
										type: 'string',
										fullTextSearch: {
											term: 'control past'
										}
									}
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.message.id
	}))
})

ava.serial('full-text search should not match on root-level string fields for mismatching queries', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					name: {
						type: 'string',
						fullTextSearch: {
							term: 'coffee'
						}
					}
				},
				required: [
					'name'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(!_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should not match on root-level array fields for mismatching queries', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					tags: {
						type: 'array',
						fullTextSearch: {
							term: 'mismatch'
						}
					}
				},
				required: [
					'tags'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(!_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should not match on card data->string fields for mismatching queries', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'category'
						],
						properties: {
							category: {
								type: 'string',
								fullTextSearch: {
									term: 'coffee'
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(!_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should not match on card data->array fields for mismatching queries', async (test) => {
	const result = await executeSearch(test, 'support-thread',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'tags'
						],
						properties: {
							tags: {
								type: 'array',
								fullTextSearch: {
									term: 'coffee'
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(!_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})

ava.serial('full-text search should not match on card data->object->string fields for mismatching queries', async (test) => {
	const result = await executeSearch(test, 'message',
		[
			{
				properties: {
					data: {
						type: 'object',
						required: [
							'payload'
						],
						properties: {
							type: 'object',
							required: [
								'message'
							],
							payload: {
								properties: {
									message: {
										type: 'string',
										fullTextSearch: {
											term: 'coffee'
										}
									}
								}
							}
						}
					}
				},
				required: [
					'data'
				]
			}
		])

	test.is(result.code, 200)
	test.truthy(!_.find(result.response.data, {
		id: test.context.message.id
	}))
})

ava.serial('full-text search should match queries that also require "has attached element"', async (test) => {
	const result = await test.context.http(
		'POST',
		'/api/v2/query',
		{
			query: {
				type: 'object',
				additionalProperties: true,
				$$links: {
					'has attached element': {
						type: 'object',
						properties: {
							type: {
								enum: [
									'message@1.0.0'
								]
							}
						},
						additionalProperties: true
					}
				},
				required: [
					'active',
					'type'
				],
				anyOf: [
					{
						properties: {
							name: {
								type: 'string',
								fullTextSearch: {
									term: 'control past'
								}
							}
						},
						required: [
							'name'
						]
					}
				],
				properties: {
					type: {
						type: 'string',
						const: 'support-thread@1.0.0'
					},
					active: {
						type: 'boolean',
						const: true
					}
				}
			},
			options: {
				limit: 100
			}
		},
		{
			Authorization: `Bearer ${test.context.token}`
		}
	)

	test.is(result.code, 200)
	test.truthy(_.find(result.response.data, {
		id: test.context.supportThread.id
	}))
})
