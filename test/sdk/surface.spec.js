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
const _ = require('lodash')
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')
const Surface = require('../../lib/sdk/surface')
const CARDS = require('../../lib/sdk/cards')
const utils = require('../../lib/utils')

ava.test.beforeEach(async (test) => {
	test.context.backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await test.context.backend.connect()
	await test.context.backend.reset()

	test.context.kernel = new Kernel(test.context.backend, {
		buckets: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	test.context.surface = new Surface(test.context.kernel)
	await test.context.surface.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.backend.disconnect()
})

for (const category of _.keys(CARDS)) {
	for (const card of _.values(CARDS[category])) {
		ava.test(`should contain the ${category} card ${card.slug} by default`, async (test) => {
			const element = await test.context.surface.getCard(card.slug)
			test.deepEqual(CARDS[category][card.slug], _.omit(element, [ 'id' ]))
		})

		if (category !== 'core') {
			ava.test(`should contain a create event for the ${card.slug} card`, async (test) => {
				const element = await test.context.surface.getCard(card.slug)
				const timeline = await utils.getTimeline(test.context.surface, element.id)
				test.is(timeline.length, 1)
				test.is(timeline[0].type, 'create')
			})
		}
	}
}
