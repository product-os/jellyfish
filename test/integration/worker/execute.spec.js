/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(helpers.worker.after)

ava('.execute() should execute an action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: test.context.generateRandomSlug(),
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.data.id)
	test.is(card.data.foo, 'bar')
})

ava('.execute() should execute a triggered action given a matching mode', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const command = test.context.generateRandomSlug()
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
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: command
							}
						}
					}
				}
			},
			mode: 'insert',
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: command
				}
			}
		}
	])

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						command
					}
				}
			}
		})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${command}@latest`)
	test.truthy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${slug}@latest`)

	test.is(resultCard.data.command, command)
})

ava('.execute() should not execute a triggered action given a non matching mode', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const command = test.context.generateRandomSlug()
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
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: command
							}
						}
					}
				}
			},
			mode: 'update',
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: command
				}
			}
		}
	])

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						command
					}
				}
			}
		})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${command}@latest`)
	test.falsy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${slug}@latest`)

	test.is(resultCard.data.command, command)
})

ava('.execute() should not execute a triggered action with a future start date', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const command = test.context.generateRandomSlug()
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
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: command
							}
						}
					}
				}
			},
			startDate: '2500-01-01T00:00:00.000Z',
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: command
				}
			}
		}
	])

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				data: {
					command
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, `${command}@latest`)
	test.falsy(card)
})

ava('.execute() should execute a triggered action with a top level anyOf', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const command = test.context.generateRandomSlug()
	test.context.worker.setTriggers(test.context.context, [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			slug: 'triggered-action-foo-bar',
			filter: {
				type: 'object',
				required: [ 'data' ],
				anyOf: [
					{
						properties: {
							data: {
								type: 'object',
								required: [ 'command' ],
								properties: {
									command: {
										type: 'string',
										const: command
									}
								}
							}
						}
					},
					{
						properties: {
							data: {
								type: 'string'
							}
						}
					}
				]
			},
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: command
				}
			}
		}
	])

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug,
				data: {
					command
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${command}@latest`)
	test.truthy(card)
})

ava('.execute() should add a create event when creating a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug,
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: result.data.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'create@1.0.0')
})

ava('.execute() should be able to AGGREGATE based on the card timeline', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeType.id,
			type: typeType.type,
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						schema: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									const: `${slug}@1.0.0`
								},
								data: {
									type: 'object',
									properties: {
										mentions: {
											type: 'array',
											$$formula: 'AGGREGATE($events, "data.payload.mentions")'
										}
									},
									additionalProperties: true
								}
							},
							additionalProperties: true,
							required: [ 'type', 'data' ]
						}
					}
				}
			}
		})

	await test.context.flush(test.context.session)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeResult.data.id,
			type: typeResult.data.type,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: test.context.generateRandomSlug(),
					data: {
						mentions: []
					}
				}
			}
		})

	await test.context.flush(test.context.session)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest1 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: threadResult.data.id,
			type: threadResult.data.type,
			arguments: {
				type: 'message',
				payload: {
					mentions: [ 'johndoe' ],
					message: 'Hello'
				}
			}
		})

	const messageRequest2 = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-event@1.0.0',
			context: test.context.context,
			card: threadResult.data.id,
			type: threadResult.data.type,
			arguments: {
				type: 'message',
				payload: {
					mentions: [ 'janedoe', 'johnsmith' ],
					message: 'Hello'
				}
			}
		})

	await test.context.flush(test.context.session)
	await test.context.flush(test.context.session)
	const messageResult1 = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest1)
	const messageResult2 = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest2)
	test.false(messageResult1.error)
	test.false(messageResult2.error)

	const thread = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(
		_.sortBy(thread.data.mentions),
		_.sortBy([ 'johndoe', 'janedoe', 'johnsmith' ]))
})

ava('.execute() AGGREGATE should create a property on the target if it does not exist', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: `${slug}@1.0.0`
							},
							data: {
								type: 'object',
								properties: {
									mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload.mentions")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			reason: null,
			properties: {
				slug: test.context.generateRandomSlug(),
				version: '1.0.0',
				data: {}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)
	test.deepEqual(thread.data.mentions, [ 'johndoe' ])
})

ava('.execute() AGGREGATE should work with $$ prefixed properties', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: `${slug}@1.0.0`
							},
							data: {
								type: 'object',
								properties: {
									$$mentions: {
										type: 'array',
										$$formula: 'AGGREGATE($events, "data.payload[\'$$mentions\']")'
									}
								},
								additionalProperties: true
							}
						},
						additionalProperties: true,
						required: [ 'type', 'data' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: 'type',
		arguments: {
			reason: null,
			properties: {
				slug: test.context.generateRandomSlug(),
				version: '1.0.0',
				data: {
					$$mentions: []
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		card: threadResult.data.id,
		context: test.context.context,
		type: slug,
		arguments: {
			type: 'message',
			tags: [],
			payload: {
				$$mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const thread = await test.context.jellyfish.getCardById(test.context.context, test.context.session, threadResult.data.id)

	test.deepEqual(thread.data.$$mentions, [ 'johndoe' ])
})

ava('.execute() should create a message with tags', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: `${slug}@1.0.0`
							}
						},
						additionalProperties: true,
						required: [ 'type' ]
					}
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const typeResult = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(typeResult.error)

	const threadRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeResult.data.id,
		type: typeResult.data.type,
		arguments: {
			reason: null,
			properties: {
				slug: test.context.generateRandomSlug(),
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const threadResult = await test.context.queue.producer.waitResults(
		test.context.context, threadRequest)
	test.false(threadResult.error)

	const messageRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-event@1.0.0',
		context: test.context.context,
		card: threadResult.data.id,
		type: threadResult.data.type,
		arguments: {
			type: 'message',
			tags: [ 'testtag' ],
			payload: {
				$$mentions: [ 'johndoe' ],
				message: 'Hello'
			}
		}
	})

	await test.context.flush(test.context.session)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const element = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, messageResult.data.id, {
			type: messageResult.data.type
		})

	test.deepEqual(element.tags, [ 'testtag' ])
})

ava('.execute() should add an execution event to the action request', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const request = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: `${actionCard.slug}@${actionCard.version}`,
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: test.context.generateRandomSlug(),
				version: '1.0.0',
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const timeline = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target' ],
				additionalProperties: true,
				properties: {
					target: {
						type: 'string',
						const: request.id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'execute@1.0.0')
})

ava('.execute() should execute a triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card@latest')

	const command = test.context.generateRandomSlug()
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
						required: [ 'command' ],
						properties: {
							command: {
								type: 'string',
								const: command
							}
						}
					}
				}
			},
			action: 'action-create-card@1.0.0',
			target: typeCard.id,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: command
				}
			}
		}
	])

	const slug = test.context.generateRandomSlug()
	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: `${actionCard.slug}@${actionCard.version}`,
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug,
					version: '1.0.0',
					data: {
						command
					}
				}
			}
		})

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const card = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${command}@latest`)
	test.truthy(card)

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, `${slug}@latest`)

	test.is(resultCard.data.command, command)
})
