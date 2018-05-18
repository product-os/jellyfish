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

ava.test('should add a string to an empty array', async (test) => {
	const id1 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				array: []
			}
		}
	})

	const id2 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-set-add',
		targetId: id1,
		actorId: test.context.actor.id
	}, {
		property: 'data.array',
		value: 'foo'
	})

	test.is(id1, id2)

	const card = await test.context.jellyfish.getCardById(test.context.session, id1)

	test.deepEqual(card, {
		id: id1,
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			array: [ 'foo' ]
		}
	})
})

ava.test('should add a string to a non empty array', async (test) => {
	const id1 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				array: [ 'foo', 'bar' ]
			}
		}
	})

	const id2 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-set-add',
		targetId: id1,
		actorId: test.context.actor.id
	}, {
		property: 'data.array',
		value: 'baz'
	})

	test.is(id1, id2)

	const card = await test.context.jellyfish.getCardById(test.context.session, id1)

	test.deepEqual(card, {
		id: id1,
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			array: [ 'foo', 'bar', 'baz' ]
		}
	})
})

ava.test('should not store duplicates', async (test) => {
	const id1 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				array: [ 'foo', 'bar' ]
			}
		}
	})

	const id2 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-set-add',
		targetId: id1,
		actorId: test.context.actor.id
	}, {
		property: 'data.array',
		value: 'foo'
	})

	test.is(id1, id2)

	const card = await test.context.jellyfish.getCardById(test.context.session, id1)

	test.deepEqual(card, {
		id: id1,
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			array: [ 'foo', 'bar' ]
		}
	})
})

ava.test('should not discard existing duplicates', async (test) => {
	const id1 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id
	}, {
		properties: {
			data: {
				array: [ 'foo', 'foo' ]
			}
		}
	})

	const id2 = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-set-add',
		targetId: id1,
		actorId: test.context.actor.id
	}, {
		property: 'data.array',
		value: 'bar'
	})

	test.is(id1, id2)

	const card = await test.context.jellyfish.getCardById(test.context.session, id1)

	test.deepEqual(card, {
		id: id1,
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			array: [ 'foo', 'foo', 'bar' ]
		}
	})
})
