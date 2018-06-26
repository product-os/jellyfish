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

ava.test('should update the user email', async (test) => {
	const target = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')

	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-update-email',
		targetId: target.id,
		actorId: test.context.actor.id
	}, {
		email: 'foobar@example.com'
	})

	test.is(result.id, target.id)
	test.is(result.data.email, 'foobar@example.com')

	const timeline = await helpers.getTimeline(test.context.jellyfish, test.context.session, result.id)
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

	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-update-email',
		targetId: target.id,
		actorId: test.context.actor.id
	}, {
		email: target.data.email
	})

	test.is(result.id, target.id)
	test.is(result.data.email, target.data.email)
	const timeline = await helpers.getTimeline(test.context.jellyfish, test.context.session, result.id)
	test.is(timeline.length, 0)
})
