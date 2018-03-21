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
const errors = require('../../../lib/sdk/errors')

ava.test('should create a card', async (test) => {
	const id = await test.context.surface.executeAction('action-create-card', 'card', {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const card = await test.context.surface.getCard(id)

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

	const timeline = _.map(await test.context.surface.getTimeline(id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if the card type does not exist', async (test) => {
	await test.throws(test.context.surface.executeAction('action-create-card', 'foobarbazqux', {
		properties: {
			slug: 'hello'
		}
	}), errors.JellyfishNoElement)
})

ava.test('should fail if the card already exists', async (test) => {
	const card = {
		slug: 'johndoe',
		data: {
			email: 'johndoe@example.com'
		}
	}

	const id = await test.context.surface.executeAction('action-create-card', 'card', {
		properties: card
	})

	await test.throws(test.context.surface.executeAction('action-create-card', 'card', {
		properties: card
	}), errors.JellyfishElementAlreadyExists)

	const timeline = _.map(await test.context.surface.getTimeline(id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should fail if there is a schema mismatch', async (test) => {
	await test.throws(test.context.surface.executeAction('action-create-card', 'user', {
		properties: {
			slug: 'foobar',
			data: {
				email: 1
			}
		}
	}), errors.JellyfishSchemaMismatch)
})

ava.test('should fail if the element is not a valid card', async (test) => {
	await test.throws(test.context.surface.executeAction('action-create-card', 'card', {
		properties: {
			slug: 'johndoe',
			foo: 'bar'
		}
	}), errors.JellyfishSchemaMismatch)
})

ava.test('should create an inactive card', async (test) => {
	const id = await test.context.surface.executeAction('action-create-card', 'card', {
		properties: {
			slug: 'johndoe',
			active: false,
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const card = await test.context.surface.getCard(id, {
		inactive: true
	})

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
	const id = await test.context.surface.executeAction('action-create-card', 'card', {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com',
				foobar: true
			}
		}
	})

	const card = await test.context.surface.getCard(id)

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

	const timeline = _.map(await test.context.surface.getTimeline(id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})
