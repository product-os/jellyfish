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
const _ = require('lodash')
const helpers = require('./helpers')
const sync = require('../../../lib/action-library/sync')

ava.test.beforeEach(helpers.beforeEach)
ava.test.afterEach(helpers.afterEach)

ava.test('.importCards() should import no card', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [])
})

ava.test('.importCards() should throw if the type is invalid', async (test) => {
	await test.throws(sync.importCards(test.context.context, test.context.session, [
		{
			slug: 'hello-world',
			type: 'xxxxxxxxxxxxx',
			data: {
				test: 1
			}
		}
	], {
		actor: test.context.actor.id
	}), test.context.worker.errors.WorkerNoElement)
})

ava.test('.importCards() should import a single card', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			slug: 'hello-world',
			type: 'card',
			data: {
				test: 1
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: result[0].id,
			slug: 'hello-world',
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should import a single card with an id', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			slug: 'hello-world',
			type: 'card',
			data: {
				test: 1
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			slug: 'hello-world',
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should patch an existing card', async (test) => {
	const card = await test.context.jellyfish.insertCard(test.context.session, {
		type: 'card',
		active: true,
		links: {},
		tags: [],
		data: {
			test: 1
		}
	})

	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			id: card.id,
			type: 'card',
			active: false,
			links: {},
			tags: [],
			data: {
				test: 1
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: card.id,
			type: 'card',
			active: false,
			links: {},
			tags: [],
			data: {
				test: 1
			}
		}
	])
})

ava.test('.importCards() should import two independent cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			type: 'card',
			data: {
				test: 2
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: result[0].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 2
			}
		}
	])
})

ava.test('.importCards() should import two parallel cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		[
			{
				type: 'card',
				data: {
					test: 1
				}
			},
			{
				type: 'card',
				data: {
					test: 2
				}
			}
		]
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(_.sortBy(result, 'data.test'), [
		{
			id: result[0].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 2
			}
		}
	])
})

ava.test('.importCards() should import dependent cards', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			type: 'card',
			data: {
				target: {
					$eval: 'cards[0].id'
				}
			}
		}
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(result, [
		{
			id: result[0].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				target: result[0].id
			}
		}
	])
})

ava.test('.importCards() should throw if a template does not evaluate', async (test) => {
	await test.throws(sync.importCards(test.context.context, test.context.session, [
		{
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			type: 'card',
			data: {
				target: {
					$eval: 'cards[0].hello'
				}
			}
		}
	], {
		actor: test.context.actor.id
	}), test.context.worker.errors.WorkerInvalidTemplate)
})

ava.test('.importCards() should import a dependent card in parallel segment', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			type: 'card',
			data: {
				test: 1
			}
		},
		[
			{
				type: 'card',
				data: {
					test: 2
				}
			},
			{
				type: 'card',
				data: {
					test: 3,
					target: {
						$eval: 'cards[0].id'
					}
				}
			}
		]
	], {
		actor: test.context.actor.id
	})

	test.deepEqual(_.sortBy(result, 'data.test'), [
		{
			id: result[0].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 1
			}
		},
		{
			id: result[1].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 2
			}
		},
		{
			id: result[2].id,
			active: true,
			links: {},
			tags: [],
			type: 'card',
			data: {
				test: 3,
				target: result[0].id
			}
		}
	])
})

ava.test('.importCards() should add create events', async (test) => {
	const result = await sync.importCards(test.context.context, test.context.session, [
		{
			slug: 'hello-world',
			type: 'card',
			data: {
				test: 1
			}
		}
	], {
		actor: test.context.actor.id
	})

	await test.context.flush(test.context.session)

	const timeline = await test.context.jellyfish.query(test.context.session, {
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
						const: result[0].id
					}
				}
			}
		}
	})

	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'create')
})
