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
const helpers = require('../helpers')

ava.test('should add a string to an empty array', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					array: []
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-set-add',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			property: 'data.array',
			value: 'foo'
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should add a string to a non empty array', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					array: [ 'foo', 'bar' ]
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-set-add',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			property: 'data.array',
			value: 'baz'
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should not store duplicates', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					array: [ 'foo', 'bar' ]
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-set-add',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			property: 'data.array',
			value: 'foo'
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})

ava.test('should not discard existing duplicates', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				data: {
					array: [ 'foo', 'foo' ]
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-set-add',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {
			property: 'data.array',
			value: 'bar'
		}
	})

	test.is(result1.id, result2.id)
	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)
	test.deepEqual(card, result2)
})
