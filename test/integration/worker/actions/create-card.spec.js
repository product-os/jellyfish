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

ava('should fail to create an event with an action-create-card', async (test) => {
	const cardType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const typeType = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'type@latest')

	const id = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeType.id,
		type: typeType.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'test-thread',
				version: '1.0.0',
				data: {
					schema: {
						type: 'object',
						properties: {
							type: {
								type: 'string',
								const: 'test-thread@1.0.0'
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
		test.context.context, id)
	test.false(typeResult.error)

	const threadId = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
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
		test.context.context, threadId)
	test.false(threadResult.error)

	await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		card: cardType.id,
		context: test.context.context,
		type: cardType.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug: 'bar',
				data: {
					timestamp: '2018-05-05T00:21:02.459Z',
					target: threadResult.data.id,
					actor: test.context.actor.id,
					payload: {
						mentions: [ 'johndoe' ]
					}
				}
			}
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		{
			message: 'You may not use card actions to create an event'
		}
	)
})

ava('should create a new card along with a reason', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: 'My new card',
				properties: {
					slug: test.context.generateRandomSlug(),
					version: '1.0.0'
				}
			}
		})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const timeline = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'create@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					additionalProperties: true,
					properties: {
						target: {
							type: 'string',
							const: createResult.data.id
						}
					}
				}
			}
		})

	test.is(timeline.length, 1)
	test.is(timeline[0].name, 'My new card')
})

ava('should be able to insert a deeply nested card', async (test) => {
	const data = {
		foo: {
			bar: {
				baz: {
					qux: {
						foo: {
							bar: {
								baz: {
									qux: {
										foo: {
											bar: {
												baz: {
													qux: {
														foo: {
															bar: {
																baz: {
																	qux: {
																		test: 1
																	}
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const slug = test.context.generateRandomSlug()
	const createRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-create-card@1.0.0',
		context: test.context.context,
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug,
				version: '1.0.0',
				data
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, createResult.data.id, {
			type: createResult.data.type
		})

	test.deepEqual(card.slug, slug)
	test.deepEqual(card.version, '1.0.0')
	test.deepEqual(card.data, data)
})
