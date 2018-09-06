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

ava.test.beforeEach(async (test) => {
	await helpers.beforeEach(test)
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
				attachEvents: options.attachEvents,
				executeAction: test.context.executeAction
			}, object)
		}
	}
})

ava.test.afterEach(helpers.afterEach)

ava.test('.insertCard() should insert a card', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		active: true,
		links: {},
		tags: [],
		data: {
			foo: 1
		}
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card, {
		id: result.id,
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			foo: 1
		}
	})
})

ava.test('.insertCard() should ignore an explicit type property', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		active: true,
		type: 'foo',
		links: {},
		tags: [],
		data: {
			foo: 1
		}
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.type, 'card')
})

ava.test('.insertCard() should default active to true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.true(card.active)
})

ava.test('.insertCard() should be able to set active to false', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		active: false
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.false(card.active)
})

ava.test('.insertCard() should provide sane defaults for links', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.links, {})
})

ava.test('.insertCard() should provide sane defaults for tags', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.tags, [])
})

ava.test('.insertCard() should provide sane defaults for data', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.deepEqual(card.data, {})
})

ava.test('.insertCard() should be able to set a slug', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.slug, 'foo-bar')
})

ava.test('.insertCard() should be able to set a name', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		name: 'Hello'
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, result.id)
	test.is(card.name, 'Hello')
})

ava.test('.insertCard() should override if the override option is true', async (test) => {
	const previousCard = await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz',
		active: false
	})

	test.deepEqual(test.context.queue, [])
	const card = await test.context.jellyfish.getCardById(test.context.session, previousCard.id)
	test.false(card.active)
})

ava.test('.insertCard() throw if card already exists and override is false', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await test.throws(executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz',
		active: false
	}), test.context.jellyfish.errors.JellyfishElementAlreadyExists)
})

ava.test('.insertCard() should add a create event if attachEvents is true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz'
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				payload: {
					slug: 'foo-bar-baz',
					active: true,
					links: {},
					tags: [],
					data: {}
				}
			}
		}
	])
})

ava.test('.insertCard() should add a create event not overriding even if override is true', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: true,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz'
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'create',
				payload: {
					slug: 'foo-bar-baz',
					active: true,
					links: {},
					tags: [],
					data: {}
				}
			}
		}
	])
})

ava.test('.insertCard() should add an update event if attachEvents is true and overriding a card', async (test) => {
	await test.context.jellyfish.insertCard(test.context.session, {
		slug: 'foo-bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: true,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		slug: 'foo-bar-baz',
		active: false
	})

	test.deepEqual(test.context.queue, [
		{
			action: 'action-create-event',
			card: result.id,
			arguments: {
				type: 'update',
				payload: {
					slug: 'foo-bar-baz',
					active: false,
					links: {},
					tags: [],
					data: {}
				}
			}
		}
	])
})

ava.test('.insertCard() should execute one matching triggered action', async (test) => {
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
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
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
				payload: {
					active: true,
					links: {},
					tags: [],
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
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])
})

ava.test('.insertCard() should not execute non-matching triggered actions', async (test) => {
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
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
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
				payload: {
					active: true,
					links: {},
					tags: [],
					data: {
						command: 'qux-bar-baz'
					}
				}
			}
		}
	])
})

ava.test('.insertCard() should execute more than one matching triggered action', async (test) => {
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
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
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
				payload: {
					active: true,
					links: {},
					tags: [],
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
			arguments: {
				properties: {
					slug: 'bar-baz-qux'
				}
			}
		}
	])
})

ava.test('.insertCard() should execute the matching triggered actions given more than one', async (test) => {
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
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction,
		triggers
	}, {
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
				payload: {
					active: true,
					links: {},
					tags: [],
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
			arguments: {
				properties: {
					slug: 'foo-bar-baz'
				}
			}
		}
	])
})

ava.test('.insertCard() should evaluate a type formula', async (test) => {
	const typeCard = {
		slug: 'test-type',
		type: 'type',
		active: true,
		links: {},
		tags: [],
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
	}

	await test.context.jellyfish.insertCard(test.context.session, typeCard)
	const result = await executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		data: {
			foo: 'hello'
		}
	})

	test.deepEqual(result.data, {
		foo: 'HELLO'
	})
})

ava.test('.insertCard() should throw if the result of the formula is incompatible with the given type', async (test) => {
	const typeCard = {
		slug: 'test-type',
		type: 'type',
		active: true,
		links: {},
		tags: [],
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
	}

	await test.context.jellyfish.insertCard(test.context.session, typeCard)
	await test.throws(executor.insertCard(test.context.jellyfish, test.context.session, typeCard, {
		override: false,
		attachEvents: true,
		executeAction: test.context.executeAction
	}, {
		data: {
			foo: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should remove previously inserted type triggered actions if inserting a type', async (test) => {
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	const cards = [
		{
			type: 'triggered-action',
			active: true,
			links: {},
			tags: [],
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
		},
		{
			type: 'triggered-action',
			active: true,
			links: {},
			tags: [],
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
						data: {
							number: {
								$eval: 'source.data.number'
							}
						}
					}
				}
			}
		}
	]

	for (const card of cards) {
		await test.context.jellyfish.insertCard(test.context.session, card)
	}

	await executor.insertCard(
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.session, 'type'),
		{
			override: false,
			attachEvents: false,
			executeAction: test.context.executeAction
		}, {
			slug: 'foo',
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

	test.deepEqual(triggers, [
		Object.assign({}, cards[1], {
			id: triggers[0].id
		})
	])
})

ava.test('.insertCard() should remove previously inserted type triggered actions if deactivating a type', async (test) => {
	const type = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'type',
		slug: 'foo',
		active: true,
		links: {},
		tags: [],
		data: {
			schema: {
				type: 'object'
			}
		}
	})

	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')
	await test.context.jellyfish.insertCard(test.context.session, {
		type: 'triggered-action',
		active: true,
		links: {},
		tags: [],
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

	type.active = false
	await executor.insertCard(
		test.context.jellyfish,
		test.context.session,
		await test.context.jellyfish.getCardBySlug(test.context.session, 'type'),
		{
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

ava.test('.insertCard() should add a triggered action given a type with an AGGREGATE formula', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, {
		slug: 'test-thread',
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
			active: true,
			links: {},
			tags: [],
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

ava.test('.insertCard() should pre-register a triggered action if using AGGREGATE', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, {
		slug: 'test-thread',
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

ava.test('.insertCard() should update pre-registered triggered actions if removing an AGGREGATE', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		triggers: test.context.triggers,
		setTriggers: test.context.context.setTriggers
	}, {
		slug: 'test-thread',
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
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction,
		triggers: test.context.triggers,
		setTriggers: test.context.context.setTriggers
	}, {
		slug: 'test-thread',
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

ava.test('.insertCard() should add multiple triggered actions given a type with an AGGREGATE formula', async (test) => {
	const typeType = await test.context.jellyfish.getCardBySlug(test.context.session, 'type')
	const type = {
		slug: 'test-thread',
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
		override: false,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, type)

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
		override: true,
		attachEvents: false,
		executeAction: test.context.executeAction,
		setTriggers: test.context.context.setTriggers
	}, type)

	await executor.insertCard(test.context.jellyfish, test.context.session, typeType, {
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

ava.test('.run() should create a card', async (test) => {
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
				slug: 'foo-bar-baz'
			}
		}
	})

	test.deepEqual(result, {
		id: result.id,
		slug: 'foo-bar-baz',
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {}
	})
})

ava.test('.run() should throw if the input card does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	await test.throws(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava.test('.run() should throw if the actor does not exist', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throws(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerNoElement)
})

ava.test('.run() should throw if input card does not match the action filter', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	await test.throws(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
		'action-create-card': actionLibrary['action-create-card']
	}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: actionCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerSchemaMismatch)
})

ava.test('.run() should throw if the arguments do not match the action', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throws(executor.run(test.context.jellyfish, test.context.session, test.context.context, {
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

ava.test('.run() should throw if the action has no corresponding implementation', async (test) => {
	const actionCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'action-create-card')
	const typeCard = await test.context.jellyfish.getCardBySlug(test.context.session, 'card')

	await test.throws(executor.run(test.context.jellyfish, test.context.session, test.context.context, {}, {
		actor: test.context.actor.id,
		action: actionCard,
		timestamp: '2018-07-04T00:22:52.247Z',
		card: typeCard.id,
		arguments: {
			properties: {
				slug: 'foo-bar-baz'
			}
		}
	}), errors.WorkerInvalidAction)
})
