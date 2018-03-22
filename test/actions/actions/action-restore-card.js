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

ava.test('should restore an active card', async (test) => {
	const id = await test.context.executeAction('action-create-card', 'card', {
		properties: {
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const result = await test.context.executeAction('action-restore-card', id, {})
	test.is(result, id)

	const card = await test.context.jellyfish.getCard(id)

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

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})

ava.test('should restore an inactive card', async (test) => {
	const id = await test.context.executeAction('action-create-card', 'card', {
		properties: {
			active: false,
			slug: 'johndoe',
			data: {
				email: 'johndoe@example.com'
			}
		}
	})

	const result = await test.context.executeAction('action-restore-card', id, {})
	test.is(result, id)

	const card = await test.context.jellyfish.getCard(id)

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

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, id), 'type')
	test.deepEqual(timeline, [ 'create', 'update' ])
})
