/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')
const errors = require('../../../lib/worker/errors')
const executor = require('../../../lib/worker/executor')
const utils = require('../../../lib/worker/utils')
const Promise = require('bluebird')

ava.beforeEach(async (test) => {
	await helpers.jellyfish.beforeEach(test)

	test.context.triggers = []
	test.context.stubQueue = []
	test.context.executeAction = (session, request) => {
		test.context.stubQueue.push(request)
	}

	test.context.actionContext = {
		errors,
		cards: test.context.jellyfish.cards,
		getEventSlug: utils.getEventSlug,
		privilegedSession: test.context.session,
		context: test.context.context,
		getCardById: (session, id, options) => {
			return test.context.jellyfish.getCardById(test.context.context, session, id, options)
		},
		getCardBySlug: (session, slug, options) => {
			return test.context.jellyfish.getCardBySlug(test.context.context, session, slug, options)
		},
		setTriggers: (context, triggers) => {
			test.context.triggers = triggers
		},
		insertCard: (session, typeCard, options, object) => {
			return executor.insertCard(test.context.context, test.context.jellyfish, session, typeCard, {
				context: test.context.actionContext,
				library: actionLibrary,
				actor: test.context.actor.id,
				currentTime: new Date(),
				attachEvents: options.attachEvents,
				executeAction: test.context.executeAction
			}, object)
		}
	}
})

ava.afterEach(helpers.jellyfish.afterEach)

ava('.insertCard() should insert a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		data: {
			foo: 1
		}
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.deepEqual(card, test.context.jellyfish.defaults({
		created_at: result.created_at,
		id: result.id,
		name: null,
		slug: 'foo',
		type: 'card',
		data: {
			foo: 1
		}
	}))
})

ava('.insertCard() should ignore an explicit type property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		active: true,
		slug: 'foo',
		type: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		data: {
			foo: 1
		}
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.is(card.type, 'card')
})

ava('.insertCard() should default active to true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.true(card.active)
})

ava('.patchCard() should ignore pointless updates', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')

	const result1 = await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: true,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		}, {
			slug: 'foo',
			version: '1.0.0',
			active: true
		})

	const result2 = await executor.patchCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: true,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		}, result1, [])

	const result3 = await executor.patchCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		}, result1, [
			{
				op: 'replace',
				path: '/active',
				value: true
			}
		])

	test.deepEqual(test.context.stubQueue, [])
	test.truthy(result1)
	test.falsy(result2)
	test.falsy(result3)

	const card = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, result1.id)
	test.is(card.created_at, result1.created_at)
})

ava('.insertCard() should be able to set active to false', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0',
		active: false
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.false(card.active)
})

ava('.insertCard() should provide sane defaults for links', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.deepEqual(card.links, {})
})

ava('.insertCard() should provide sane defaults for tags', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.deepEqual(card.tags, [])
})

ava('.insertCard() should provide sane defaults for data', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.deepEqual(card.data, {})
})

ava('.insertCard() should be able to set a slug', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar',
		version: '1.0.0'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.is(card.slug, 'foo-bar')
})

ava('.insertCard() should be able to set a name', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0',
		name: 'Hello'
	})

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, result.id)
	test.is(card.name, 'Hello')
})

ava('.patchCard() should not upsert if no changes were made', async (test) => {
	const element = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await executor.patchCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, element, [])

	test.deepEqual(test.context.stubQueue, [])
})

ava('.patchCard() should set a card to inactive', async (test) => {
	const previousCard = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await executor.patchCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, previousCard, [
		{
			op: 'replace',
			path: '/active',
			value: false
		}
	])

	test.deepEqual(test.context.stubQueue, [])
	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, previousCard.id)
	test.false(card.active)
})

ava('.insertCard() throw if card already exists and override is false', async (test) => {
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.throwsAsync(executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: false,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, {
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false
	}), test.context.jellyfish.errors.JellyfishElementAlreadyExists)
})

ava('.insertCard() should add a create event if attachEvents is true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const result = await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: true,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		}, {
			version: '1.0.0',
			slug: 'foo-bar-baz'
		})

	test.deepEqual(test.context.stubQueue, [])
	const tail = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'create'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					properties: {
						target: {
							type: 'string',
							const: result.id
						}
					}
				}
			}
		})

	test.is(tail.length, 1)
})

ava('.patchCard() should add an update event if attachEvents is true', async (test) => {
	const element = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const result = await executor.patchCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction
	}, element, [
		{
			op: 'replace',
			path: '/active',
			value: false
		}
	])

	test.deepEqual(test.context.stubQueue, [])
	const tail = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'update'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					properties: {
						target: {
							type: 'string',
							const: result.id
						}
					}
				}
			}
		})

	test.is(tail.length, 1)
})

ava('.insertCard() should pass a triggered action as an action originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const triggers = [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-test-originator',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	]

	await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: true,
			context: test.context.actionContext,
			library: Object.assign({
				'action-test-originator': {
					card: Object.assign({}, actionLibrary['action-create-card'].card, {
						slug: 'action-test-originator'
					}),
					handler: async (session, context, card, request) => {
						request.arguments.properties.data = request.arguments.properties.data || {}
						request.arguments.properties.data.originator = request.originator
						return actionLibrary['action-create-card']
							.handler(session, context, card, request)
					}
				}
			}, actionLibrary),
			actor: test.context.actor.id,
			executeAction: test.context.executeAction,
			triggers
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	test.is(resultCard.data.originator, 'cb3523c5-b37d-41c8-ae32-9e7cc9309165')
})

ava('.insertCard() should be able to override a triggered action originator', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const triggers = [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-test-originator',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	]

	await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeCard, {
			currentTime: new Date(),
			attachEvents: true,
			context: test.context.actionContext,
			originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			library: Object.assign({
				'action-test-originator': {
					card: Object.assign({}, actionLibrary['action-create-card'].card, {
						slug: 'action-test-originator'
					}),
					handler: async (session, context, card, request) => {
						request.arguments.properties.data = request.arguments.properties.data || {}
						request.arguments.properties.data.originator = request.originator
						return actionLibrary['action-create-card']
							.handler(session, context, card, request)
					}
				}
			}, actionLibrary),
			actor: test.context.actor.id,
			executeAction: test.context.executeAction,
			triggers
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				command: 'foo-bar-baz'
			}
		})

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	test.is(resultCard.data.originator, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
})

ava('.insertCard() should execute one matching triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const triggers = [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	]

	const result = await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	const tail = await test.context.jellyfish.query(
		test.context.context, test.context.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type', 'data' ],
			properties: {
				type: {
					type: 'string',
					const: 'create'
				},
				data: {
					type: 'object',
					required: [ 'target' ],
					properties: {
						target: {
							type: 'string',
							const: result.id
						}
					}
				}
			}
		})

	test.is(tail.length, 1)
	test.deepEqual(test.context.stubQueue, [])

	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	test.truthy(resultCard)
})

ava('.insertCard() should not execute non-matching triggered actions', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const triggers = [
		{
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	]

	await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'qux-bar-baz'
		}
	})

	test.deepEqual(test.context.stubQueue, [])
	const resultCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	test.falsy(resultCard)
})

ava('.insertCard() should execute more than one matching triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const triggers = [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	]

	await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.deepEqual(test.context.stubQueue, [])

	const resultCard1 = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	const resultCard2 = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'bar-baz-qux', {
			type: typeCard.slug
		})

	test.truthy(resultCard1)
	test.truthy(resultCard2)
})

ava('.insertCard() should execute the matching triggered actions given more than one', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'card')
	const triggers = [
		{
			id: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		},
		{
			id: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
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
								const: 'bar-baz-qux'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			card: typeCard.id,
			type: typeCard.type,
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	]

	await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		attachEvents: true,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.deepEqual(test.context.stubQueue, [])

	const resultCard1 = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'foo-bar-baz', {
			type: typeCard.slug
		})

	const resultCard2 = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'bar-baz-qux', {
			type: typeCard.slug
		})

	test.truthy(resultCard1)
	test.falsy(resultCard2)
})

ava('.insertCard() should remove previously inserted type triggered actions if inserting a type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'foo',
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
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						version: '1.0.0',
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		},
		{
			type: 'triggered-action',
			slug: test.context.generateRandomSlug({
				prefix: 'triggered-action'
			}),
			version: '1.0.0',
			data: {
				type: 'bar',
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
									const: 'foo-bar-baz'
								}
							}
						}
					}
				},
				action: 'action-create-card',
				target: typeCard.id,
				arguments: {
					properties: {
						slug: {
							$eval: 'source.data.slug'
						},
						version: '1.0.0',
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	].map(test.context.kernel.defaults)

	const insertedCards = await Promise.map(cards, (card) => {
		return test.context.jellyfish.insertCard(test.context.context, test.context.session, card)
	})

	await executor.insertCard(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type'),
		{
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		}, {
			slug: 'foo',
			version: '1.0.0',
			data: {
				schema: {
					type: 'object'
				}
			}
		}
	)

	const triggers = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'active', 'type' ],
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})
	const updatedCard = await test.context.jellyfish.getCardById(test.context.context, test.context.session, insertedCards[1].id)

	test.deepEqual(triggers, [
		Object.assign({}, updatedCard, {
			id: triggers[0].id
		})
	])
})

ava('.patchCard() should remove previously inserted type triggered actions if deactivating a type', async (test) => {
	const type = await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'type',
		version: '1.0.0',
		slug: 'foo',
		data: {
			schema: {
				type: 'object'
			}
		}
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'triggered-action',
		slug: test.context.generateRandomSlug({
			prefix: 'triggered-action'
		}),
		version: '1.0.0',
		data: {
			type: 'foo',
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
								const: 'foo-bar-baz'
							}
						}
					}
				}
			},
			action: 'action-create-card',
			target: typeCard.id,
			arguments: {
				properties: {
					slug: {
						$eval: 'source.data.slug'
					},
					data: {
						number: {
							$eval: 'source.data.number'
						}
					}
				}
			}
		}
	})

	await executor.patchCard(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type'),
		{
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction
		},
		type,
		[
			{
				op: 'replace',
				path: '/active',
				value: false
			}
		]
	)

	const triggers = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'active', 'type' ],
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})

	test.deepEqual(triggers, [])
})

ava('.insertCard() should add a triggered action given a type with an AGGREGATE formula', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')
	await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		attachEvents: false,
		executeAction: test.context.executeAction,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		setTriggers: test.context.actionContext.setTriggers
	}, {
		slug: 'test-thread',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-thread'
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
	})

	const triggers = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'active', 'type' ],
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})

	test.deepEqual(triggers, [
		{
			created_at: triggers[0].created_at,
			updated_at: null,
			linked_at: triggers[0].linked_at,
			id: triggers[0].id,
			slug: 'triggered-action-test-thread-data-mentions',
			type: 'triggered-action',
			version: '1.0.0',
			name: null,
			active: true,
			links: {},
			tags: [],
			markers: [],
			requires: [],
			capabilities: [],
			data: {
				type: 'test-thread',
				target: triggers[0].data.target,
				action: triggers[0].data.action,
				arguments: triggers[0].data.arguments,
				filter: triggers[0].data.filter
			}
		}
	])
})

ava('.insertCard() should pre-register a triggered action if using AGGREGATE', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')
	await executor.insertCard(test.context.context, test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		attachEvents: false,
		executeAction: test.context.executeAction,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		setTriggers: test.context.actionContext.setTriggers
	}, {
		slug: 'test-thread',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-thread'
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
	})

	test.deepEqual(test.context.triggers, [
		{
			id: test.context.triggers[0].id,
			action: 'action-set-add',
			card: {
				$eval: 'source.links[\'is attached to\'][0].id'
			},
			filter: test.context.triggers[0].filter,
			arguments: {
				property: 'data.mentions',
				value: {
					$if: 'source.data.payload.mentions',
					then: {
						$eval: 'source.data.payload.mentions'
					},
					else: []
				}
			}
		}
	])
})

ava('.insertCard() should update pre-registered triggered actions if removing an AGGREGATE', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')
	const element = await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeType, {
			currentTime: new Date(),
			attachEvents: false,
			executeAction: test.context.executeAction,
			triggers: test.context.triggers,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			setTriggers: test.context.actionContext.setTriggers
		}, {
			slug: 'test-thread',
			version: '1.0.0',
			data: {
				schema: {
					type: 'object',
					properties: {
						type: {
							type: 'string',
							const: 'test-thread'
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
		})

	await executor.patchCard(test.context.context, test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		attachEvents: false,
		executeAction: test.context.executeAction,
		triggers: test.context.triggers,
		context: test.context.actionContext,
		library: actionLibrary,
		actor: test.context.actor.id,
		setTriggers: test.context.actionContext.setTriggers
	}, element, [
		{
			op: 'remove',
			path: '/data/schema/properties/data/properties/mentions/$$formula'
		}
	])

	test.deepEqual(test.context.triggers, [])
})

ava('.insertCard() should add multiple triggered actions given a type with an AGGREGATE formula', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'type')
	const type = {
		slug: 'test-thread',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-thread'
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

	const element = await executor.insertCard(
		test.context.context, test.context.jellyfish, test.context.session, typeType, {
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction,
			setTriggers: test.context.actionContext.setTriggers
		}, type)

	await executor.patchCard(
		test.context.context, test.context.jellyfish, test.context.session, typeType, {
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction,
			setTriggers: test.context.actionContext.setTriggers
		}, element, [
			{
				op: 'replace',
				path: '/active',
				value: false
			}
		])

	await executor.patchCard(
		test.context.context, test.context.jellyfish, test.context.session, typeType, {
			currentTime: new Date(),
			attachEvents: false,
			context: test.context.actionContext,
			library: actionLibrary,
			actor: test.context.actor.id,
			executeAction: test.context.executeAction,
			setTriggers: test.context.actionContext.setTriggers
		}, element, [
			{
				op: 'replace',
				path: '/active',
				value: true
			}
		])

	const triggers = await test.context.jellyfish.query(test.context.context, test.context.session, {
		type: 'object',
		additionalProperties: true,
		required: [ 'active', 'type' ],
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'triggered-action'
			}
		}
	})

	test.is(triggers.length, 1)
})

ava('.run() should create a card', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')

	const result = await executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		context: test.context.context,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				slug: 'foo-bar-baz',
				version: '1.0.0'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		type: 'card',
		slug: 'foo-bar-baz'
	})
})

ava('.run() should throw if the input card does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		context: test.context.context,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		type: 'card',
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava('.run() should throw if the actor does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		action: actionCard,
		context: test.context.context,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava('.run() should throw if input card does not match the action filter', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		context: test.context.context,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: actionCard.id,
		type: actionCard.type,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerSchemaMismatch)
})

ava('.run() should throw if the arguments do not match the action', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		context: test.context.context,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			foo: 'bar',
			bar: 'baz'
		}
	}), errors.WorkerSchemaMismatch)
})

ava('.run() should throw if the action has no corresponding implementation', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.context, test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.actionContext, {}, {
		actor: test.context.actor.id,
		action: actionCard,
		context: test.context.context,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		type: typeCard.type,
		arguments: {
			reason: null,
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerInvalidAction)
})
