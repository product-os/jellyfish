/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const helpers = require('./helpers')
const actionLibrary = require('../../../lib/action-library')
const errors = require('../../../lib/worker/errors')
const executor = require('../../../lib/worker/executor')
const Promise = require('bluebird')

ava.beforeEach(async (test) => {
	await helpers.jellyfish.beforeEach(test)
	test.context.triggers = []
	test.context.queue = []
	test.context.executeAction = (session, request) => {
		test.context.queue.push(request)
	}

	test.context.context = {
		getCardById: test.context.jellyfish.getCardById,
		getCardBySlug: test.context.jellyfish.getCardBySlug,
		setTriggers: (triggers) => {
			test.context.triggers = triggers
		},
		insertCard: (session, typeCard, options, object) => {
			return executor.insertCard(test.context.jellyfish, session, typeCard, {
				override: options.override,
				currentTime: new Date(),
				attachEvents: options.attachEvents,
				executeAction: test.context.executeAction
			}, object)
		}
	}
})

ava.afterEach(helpers.jellyfish.afterEach)

ava('.insertCard() should insert a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, test.context.kernel.defaults({
		slug: 'foo',
		version: '1.0.0',
		data: {
			foo: 1
		}
	}))

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card, test.context.kernel.defaults({
		id: result.id,
		slug: 'foo',
		type: 'card',
		version: '1.0.0',
		data: {
			foo: 1
		}
	}))
})

ava('.insertCard() should ignore an explicit type property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
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

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.type, 'card')
})

ava('.insertCard() should default active to true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.true(card.active)
})

ava('.insertCard() should be able to set active to false', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0',
		active: false
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.false(card.active)
})

ava('.insertCard() should provide sane defaults for links', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.links, {})
})

ava('.insertCard() should provide sane defaults for tags', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.tags, [])
})

ava('.insertCard() should provide sane defaults for data', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.data, {})
})

ava('.insertCard() should be able to set a slug', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.slug, 'foo-bar')
})

ava('.insertCard() should be able to set a name', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0',
		name: 'Hello'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.name, 'Hello')
})

ava('.insertCard() should override if the override option is true', async (test) => {
	const previousCard = await test.context.jellyfish.insertCard(test.context.session, test.context.kernel.defaults({
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	}))

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, previousCard.id)
	test.false(card.active)
})

ava('.insertCard() throw if card already exists and override is false', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, test.context.kernel.defaults({
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	}))

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await test.throwsAsync(executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false
	}), test.context.jellyfish.errors.JellyfishElementAlreadyExists)
})

ava('.insertCard() should add a create event if attachEvents is true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		version: '1.0.0',
		slug: 'foo-bar-baz'
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					slug: 'foo-bar-baz',
					type: 'card',
					version: '1.0.0'
				}
			}
		}
	])
})

ava('.insertCard() should add a create event not overriding even if override is true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: true,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz',
		version: '1.0.0'
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					slug: 'foo-bar-baz',
					type: 'card',
					version: '1.0.0'
				}
			}
		}
	])
})

ava('.insertCard() should add an update event if attachEvents is true and overriding a card', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, test.context.kernel.defaults({
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0'
	}))

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: true,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		version: '1.0.0',
		slug: 'foo-bar-baz',
		active: false
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'update',
				tags: [],
				payload: {
					active: false,
					slug: 'foo-bar-baz',
					type: 'card',
					version: '1.0.0'
				}
			}
		}
	])
})

ava('.insertCard() should execute one matching triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
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
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	]

	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					version: '1.0.0',
					type: 'card',
					slug: 'foo',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		},
		{
			action: 'action-create-card',
			card: typeCard.id,
			currentDate: test.context.queue[1].currentDate,
			originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])
})

ava('.insertCard() should not execute non-matching triggered actions', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
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

	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'qux-bar-baz'
		}
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					version: '1.0.0',
					type: 'card',
					slug: 'foo',
					data: {
						command: 'qux-bar-baz'
					}
				}
			}
		}
	])
})

ava('.insertCard() should execute more than one matching triggered action', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
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
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	]

	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					type: 'card',
					slug: 'foo',
					version: '1.0.0',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		},
		{
			action: 'action-create-card',
			card: typeCard.id,
			originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			currentDate: test.context.queue[1].currentDate,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		},
		{
			action: 'action-create-card',
			card: typeCard.id,
			originator: 'd6cacdef-f53b-4b5b-8aa2-8476e48248a4',
			currentDate: test.context.queue[2].currentDate,
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	])
})

ava('.insertCard() should execute the matching triggered actions given more than one', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
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
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	]

	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			command: 'foo-bar-baz'
		}
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				tags: [],
				payload: {
					type: 'card',
					slug: 'foo',
					version: '1.0.0',
					data: {
						command: 'foo-bar-baz'
					}
				}
			}
		},
		{
			action: 'action-create-card',
			card: typeCard.id,
			originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			currentDate: test.context.queue[1].currentDate,
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])
})

ava('.insertCard() should evaluate a type formula', async (test) => {
	const typeCard = test.context.kernel.defaults({
		slug: 'test-type',
		type: 'type',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-type'
					},
					data: {
						type: 'object',
						properties: {
							foo: {
								type: 'string',
								$$formula: 'UPPER(input)'
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

	await test.context.jellyfish.insertCard(test.context.session, typeCard)
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		version: '1.0.0',
		data: {
			foo: 'hello'
		}
	})

	test.deepEqual(result.data, {
		foo: 'HELLO'
	})
})

ava('.insertCard() should throw if the result of the formula is incompatible with the given type', async (test) => {
	const typeCard = test.context.kernel.defaults({
		slug: 'test-type',
		type: 'type',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					type: {
						type: 'string',
						const: 'test-type'
					},
					data: {
						type: 'object',
						properties: {
							foo: {
								type: 'number',
								$$formula: 'UPPER(input)'
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

	await test.context.jellyfish.insertCard(test.context.session, typeCard)
	await test.throwsAsync(executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		currentTime: new Date(),
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo',
		data: {
			foo: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should remove previously inserted type triggered actions if inserting a type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
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
		return test.context.jellyfish.insertCard(test.context.session, card)
	})

	await executor.insertCard(
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.session, 'type'),
		{
			currentTime: new Date(),
			override: false,
			attachEvents: false,
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

	const triggers = await test.context.jellyfish.query(test.context.session, {
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
	const updatedCard = await test.context.jellyfish.getCardById(test.context.session, insertedCards[1].id)

	test.deepEqual(triggers, [
		Object.assign({}, updatedCard, {
			id: triggers[0].id
		})
	])
})

ava('.insertCard() should remove previously inserted type triggered actions if deactivating a type', async (test) => {
	const type = await test.context.jellyfish.insertCard(test.context.session, test.context.kernel.defaults({
		type: 'type',
		version: '1.0.0',
		slug: 'foo',
		data: {
			schema: {
				type: 'object'
			}
		}
	}))

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await test.context.jellyfish.insertCard(test.context.session, test.context.kernel.defaults({
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
	}))

	type.active = false
	await executor.insertCard(
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.session, 'type'),
		{
			currentTime: new Date(),
			override: true,
			attachEvents: false,
			executeAction: test.context.executeAction
		},
		type
	)

	const triggers = await test.context.jellyfish.query(test.context.session, {
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
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
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

	const triggers = await test.context.jellyfish.query(test.context.session, {
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
			id: triggers[0].id,
			slug: 'triggered-action-test-thread-data-mentions',
			type: 'triggered-action',
			version: '1.0.0',
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
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
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
				$eval: 'source.data.target'
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
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		triggers: test.context.triggers,
		setTriggers: test.context.context.setTriggers
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

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction,
		triggers: test.context.triggers,
		setTriggers: test.context.context.setTriggers
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
								type: 'array'
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

	test.deepEqual(test.context.triggers, [])
})

ava('.insertCard() should add multiple triggered actions given a type with an AGGREGATE formula', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
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

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, type)

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, type)

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		currentTime: new Date(),
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, type)

	const triggers = await test.context.jellyfish.query(test.context.session, {
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
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	const result = await executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz',
				version: '1.0.0'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'foo-bar-baz',
		type: 'card',
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.run() should throw if the input card does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava('.run() should throw if the actor does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava('.run() should throw if input card does not match the action filter', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: actionCard.id,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerSchemaMismatch)
})

ava('.run() should throw if the arguments do not match the action', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			foo: 'bar',
			bar: 'baz'
		}
	}), errors.WorkerSchemaMismatch)
})

ava('.run() should throw if the action has no corresponding implementation', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throwsAsync(executor.run(test.context.jellyfish, test.context.session, test.context.context, {}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			properties: {
				version: '1.0.0',
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerInvalidAction)
})
