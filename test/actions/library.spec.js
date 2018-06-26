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
const randomstring = require('randomstring')
const Bluebird = require('bluebird')
const core = require('../../lib/core')
const ActionRequestWorker = require('../../lib/actions')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await core.create({
		backend: {
			host: process.env.TEST_DB_HOST,
			port: process.env.TEST_DB_PORT,
			database: `test_${randomstring.generate()}`
		},
		tables: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	test.context.session = test.context.jellyfish.sessions.admin
	test.context.actor = await test.context.jellyfish.getCardBySlug(test.context.session, 'user-admin')
	test.context.worker = new ActionRequestWorker(test.context.jellyfish, test.context.session)

	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-user.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-delete-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-session.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-restore-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-upsert-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-update-email.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-event.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-update-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-set-add.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/create.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/update.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/triggered-action.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-non-executed-action-requests.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/view-active-triggered-actions.json'))

	test.context.ids = {
		card: (await test.context.jellyfish.getCardBySlug(test.context.session, 'card')).id,
		user: (await test.context.jellyfish.getCardBySlug(test.context.session, 'user')).id,
		type: (await test.context.jellyfish.getCardBySlug(test.context.session, 'type')).id
	}

	test.context.watcher = await test.context.worker.start()
	await new Bluebird((resolve, reject) => {
		test.context.watcher.once('started', resolve)
		test.context.watcher.once('error', reject)
	})

	test.context.flushRequests = async (retries = 10) => {
		if (retries === 0) {
			throw new Error('Could not flush requests')
		}

		const requests = await test.context.worker.getPendingRequests()
		if (requests.length === 0) {
			return
		}

		await Bluebird.delay(1000)
		await test.context.flushRequests(retries - 1)
	}
})

ava.test.afterEach(async (test) => {
	await test.context.worker.stop()
	await test.context.jellyfish.disconnect()
})

require('./actions/action-create-card')
require('./actions/action-update-card')
require('./actions/action-delete-card')
require('./actions/action-restore-card')
require('./actions/action-upsert-card')
require('./actions/action-update-email')
require('./actions/action-create-user')
require('./actions/action-set-add')
