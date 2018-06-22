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

ava.test('should create a card and add a create but not update event', async (test) => {
	const result = await test.context.worker.executeAction(test.context.session, {
		actionId: 'action-upsert-card',
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

	test.deepEqual(result, {
		id: result.id,
		slug: 'johndoe',
		type: 'card',
		tags: [],
		links: [],
		active: true,
		data: {
			email: 'johndoe@example.com'
		}
	})

	const timeline = _.map(await utils.getTimeline(test.context.jellyfish, test.context.session, result.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})
