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
const helpers = require('../helpers')

ava.test('should restore an active card', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				slug: 'johndoe',
				data: {
					email: 'johndoe@example.com'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-restore-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {}
	})

	test.is(result1.id, result2.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)

	test.deepEqual(card, {
		id: result1.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	})

	const timeline = _.map(await helpers.getTimeline(test.context.jellyfish, test.context.session, result1.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should restore an inactive card', async (test) => {
	const result1 = await helpers.executeAction(test.context, {
		action: 'action-create-card',
		targetId: test.context.ids.card,
		actorId: test.context.actor.id,
		arguments: {
			properties: {
				active: false,
				slug: 'johndoe',
				data: {
					email: 'johndoe@example.com'
				}
			}
		}
	})

	const result2 = await helpers.executeAction(test.context, {
		action: 'action-restore-card',
		targetId: result1.id,
		actorId: test.context.actor.id,
		arguments: {}
	})

	test.is(result1.id, result2.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, result1.id)

	test.deepEqual(card, {
		id: result1.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	})

	const timeline = _.map(await helpers.getTimeline(test.context.jellyfish, test.context.session, result1.id), 'type')
	test.deepEqual(timeline, [ 'create', 'update' ])
})
