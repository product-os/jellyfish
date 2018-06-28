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

ava.test('should create a card and add a create but not update event', async (test) => {
	const result = await helpers.executeAction(test.context.session, test.context.worker, test.context.jellyfish, {
		action: 'action-upsert-card',
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

	const timeline = _.map(await helpers.getTimeline(test.context.jellyfish, test.context.session, result.id), 'type')
	test.deepEqual(timeline, [ 'create' ])
})
