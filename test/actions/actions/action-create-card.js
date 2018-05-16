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

const _ = require('lodash')
const ava = require('ava')
const utils = require('../../../lib/utils')

ava.test('should create a card', async (test) => {
	const id = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, id)

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	})

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if the card type does not exist', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: 'foobarbazqux',
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'hello'
		}
	}), test.context.jellyfish.errors.JellyfishNoElement)
})

ava.test('should fail if the card already exists', async (test) => {
	const card = {
		slug: 'johndoe',
		links: [],
		tags: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	}

	const id = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: card
	})

	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: card
	}), test.context.jellyfish.errors.JellyfishElementAlreadyExists)

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if there is a schema mismatch', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.user,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'foobar',
			data: {
				email: 1
			}
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('should fail if the element is not a valid card', async (test) => {
	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			foo: 'bar'
		}
	}), test.context.jellyfish.errors.JellyfishSchemaMismatch)
})

ava.test('should create an inactive card', async (test) => {
	const id = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			active: false,
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, id)

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: false,
		data: {
			email: 'johndoe@example.com'
		}
	})
})

ava.test('should create a card with more extra data properties', async (test) => {
	const id = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com',
				foobar: true
			}
		}
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, id)

	test.deepEqual(card, {
		id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			foobar: true
		}
	})

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should evaluate a simple computed property on insertion', async (test) => {
	const typeId = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-type',
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
									$formula: 'UPPER(input)'
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
	})

	const id = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: typeId,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				foo: 'hello'
			}
		}
	})

	const card = await test.context.jellyfish.getCardById(test.context.session, id)

	test.deepEqual(card, {
		id,
		type: 'test-type',
		active: true,
		links: [],
		tags: [],
		data: {
			foo: 'HELLO'
		}
	})
})

ava.test('should throw if the result of the formula is incompatible with the given type', async (test) => {
	const typeId = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.type,
		actorId: test.context.actor.id
	}, {
		properties: {
			slug: 'test-type',
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
									$formula: 'UPPER(input)'
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
	})

	await test.throws(test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: typeId,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				foo: 'hello'
			}
		}
	}), test.context.jellyfish.JellyfishSchemaMismatch)
})
