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

ava.test('should create a card and add a create but not update event', async (test) => {
	const id = await test.context.surface.executeAction('action-upsert-card', 'user', {
		properties: {
			slug: 'user-johndoe',
			data: {
				email: 'johndoe@example.com',
				roles: []
			}
		}
	})

	const card = await test.context.surface.getCard(id)

	test.deepEqual(card, {
		id,
		slug: 'user-johndoe',
		type: 'user',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com',
			roles: []
		}
	})

	const timeline = _.map(await test.context.surface.getTimeline(id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})
