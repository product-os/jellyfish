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
const sdk = require('../../lib/sdk')
const actions = require('../../lib/actions')

ava.test.beforeEach(async (test) => {
	test.context.jellyfish = await sdk.create({
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

	await test.context.jellyfish.initialize()
	test.context.session = test.context.jellyfish.sessions.admin.uuid

	test.context.executeAction =
		_.partial(actions.executeAction, test.context.jellyfish, test.context.session)
})

ava.test.afterEach(async (test) => {
	await test.context.jellyfish.disconnect()
})

require('./actions/action-create-card')
require('./actions/action-update-card')
require('./actions/action-delete-card')
require('./actions/action-restore-card')
require('./actions/action-upsert-card')
require('./actions/action-update-email')
require('./actions/action-create-user')
