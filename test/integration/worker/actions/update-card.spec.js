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

ava('should fail to update a card if the schema does not match', async (test) => {
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

	await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'add',
					path: '/foobar',
					value: true
				}
			]
		}
	})

	await test.throwsAsync(
		test.context.flush(test.context.session),
		{
			instanceOf: test.context.jellyfish.errors.JellyfishSchemaMismatch
		})
})

ava('should update a card to add an extra property', async (test) => {
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
				data: {
					foo: 'bar'
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'add',
					path: '/data/bar',
					value: 'baz'
				}
			]
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const updateCard = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id, {
			type: updateResult.data.type
		})

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: updateCard.created_at,
		updated_at: updateCard.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		slug,
		name: null,
		version: '1.0.0',
		type: 'card@1.0.0',
		links: card.links,
		data: {
			foo: 'bar',
			bar: 'baz'
		}
	}))
})

ava('should update a card to set active to false', async (test) => {
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
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'replace',
					path: '/active',
					value: false
				}
			]
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		version: '1.0.0',
		name: null,
		slug,
		type: 'card@1.0.0',
		active: false,
		links: card.links
	}))
})

ava('should update a card along with a reason', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
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

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: 'This card should have been inactive',
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const timeline = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'update@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					additionalProperties: true,
					properties: {
						target: {
							type: 'string',
							const: updateResult.data.id
						}
					}
				}
			}
		})

	test.is(timeline.length, 1)
	test.is(timeline[0].name, 'This card should have been inactive')
})

ava('should update a card to set active to false using the card slug as input', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card@latest')
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					version: '1.0.0',
					slug: 'foo-bar-baz'
				}
			}
		})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: 'foo-bar-baz',
			type: 'card@1.0.0',
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card@1.0.0',
		name: null,
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false,
		links: card.links
	}))
})

ava('should update a card to override an array property', async (test) => {
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
				data: {
					roles: [ 'guest' ]
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/data/roles',
						value: []
					}
				]
			}
		})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)

	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		type: 'card@1.0.0',
		name: null,
		slug,
		version: '1.0.0',
		links: card.links,
		data: {
			roles: []
		}
	}))
})

ava('should add an update event if updating a card', async (test) => {
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
				data: {
					foo: 1
				}
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(test.context.worker.getId(), test.context.session, {
		action: 'action-update-card@1.0.0',
		context: test.context.context,
		card: createResult.data.id,
		type: createResult.data.type,
		arguments: {
			reason: null,
			patch: [
				{
					op: 'replace',
					path: '/data/foo',
					value: 2
				}
			]
		}
	})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

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
						const: createResult.data.id
					}
				}
			}
		}
	}, {
		sortBy: 'created_at'
	})

	test.deepEqual(timeline, [
		{
			created_at: timeline[0].created_at,
			linked_at: timeline[0].linked_at,
			updated_at: null,
			id: timeline[0].id,
			name: null,
			version: '1.0.0',
			type: 'create@1.0.0',
			slug: timeline[0].slug,
			links: timeline[0].links,
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[0].data.timestamp,
				payload: {
					slug,
					type: 'card@1.0.0',
					version: '1.0.0',
					data: {
						foo: 1
					}
				}
			}
		},
		{
			created_at: timeline[1].created_at,
			updated_at: null,
			linked_at: timeline[1].linked_at,
			id: timeline[1].id,
			name: null,
			version: '1.0.0',
			type: 'update@1.0.0',
			slug: timeline[1].slug,
			links: timeline[1].links,
			data: {
				actor: test.context.actor.id,
				target: createResult.data.id,
				timestamp: timeline[1].data.timestamp,
				payload: [
					{
						op: 'replace',
						path: '/data/foo',
						value: 2
					}
				]
			}
		}
	].map(test.context.kernel.defaults))
})

ava('should delete a card using action-update-card', async (test) => {
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
				version: '1.0.0'
			}
		}
	})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/active',
						value: false
					}
				]
			}
		})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id)
	test.deepEqual(card, test.context.kernel.defaults({
		created_at: card.created_at,
		updated_at: card.updated_at,
		linked_at: card.linked_at,
		id: updateResult.data.id,
		name: null,
		type: 'card@1.0.0',
		slug,
		version: '1.0.0',
		active: false,
		links: card.links
	}))
})

ava('Updating a cards markers should update the markers of attached events', async (test) => {
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
				properties: {}
			}
		})

	await test.context.flush(session)
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

	await test.context.flush(session)
	const messageResult = await test.context.queue.producer.waitResults(
		test.context.context, messageRequest)
	test.false(messageResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: cardResult.data.id,
			type: cardResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'replace',
						path: '/markers',
						value: [ marker ]
					}
				]
			}
		})

	await test.context.flush(session)
	await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)

	const message = await jellyfish.getCardById(
		context, session, messageResult.data.id)

	test.deepEqual(message.markers, [ marker ])
})

ava('should be able to upsert a deeply nested card', async (test) => {
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
	const createRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-create-card@1.0.0',
			context: test.context.context,
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				reason: null,
				properties: {
					slug: 'foo',
					version: '1.0.0',
					data: {}
				}
			}
		})

	await test.context.flush(test.context.session)
	const createResult = await test.context.queue.producer.waitResults(
		test.context.context, createRequest)
	test.false(createResult.error)

	const updateRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, {
			action: 'action-update-card@1.0.0',
			context: test.context.context,
			card: createResult.data.id,
			type: createResult.data.type,
			arguments: {
				reason: null,
				patch: [
					{
						op: 'add',
						path: '/data/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux',
						value: {}
					},
					{
						op: 'add',
						path: '/data/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/foo/bar/baz/qux/test',
						value: 1
					}
				]
			}
		})

	await test.context.flush(test.context.session)
	const updateResult = await test.context.queue.producer.waitResults(
		test.context.context, updateRequest)
	test.false(updateResult.error)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, updateResult.data.id, {
			type: updateResult.data.type
		})

	test.deepEqual(card.slug, 'foo')
	test.deepEqual(card.version, '1.0.0')
	test.deepEqual(card.data, data)
})
