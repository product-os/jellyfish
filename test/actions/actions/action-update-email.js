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
const utils = require('../../../lib/utils')

ava.test('should update the user email', async (test) => {
	const target = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')

	const id = await test.context.worker.executeAction(test.context.session, 'action-update-email', target.id, {
		email: 'foobar@example.com'
	})

	test.is(id, target.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, id)
	test.is(card.data.email, 'foobar@example.com')

	const timeline = await utils.getTimeline(test.context.jellyfish, test.context.session, id)
	test.is(timeline.length, 1)
	test.is(timeline[0].type, 'update')
	test.deepEqual(timeline[0].data.payload, {
		slug: 'user-admin',
		name: 'The admin user',
		links: [],
		tags: [],
		active: true,
		data: {
			email: 'foobar@example.com',
			roles: []
		}
	})
})

ava.test('should not create an event if the change is already there', async (test) => {
	const target = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')

	const id = await test.context.worker.executeAction(test.context.session, 'action-update-email', target.id, {
		email: target.data.email
	})

	test.is(id, target.id)

	const card = await test.context.jellyfish.getCardById(test.context.session, id)
	test.is(card.data.email, target.data.email)

	const timeline = await utils.getTimeline(test.context.jellyfish, test.context.session, id)
	test.is(timeline.length, 0)
})
