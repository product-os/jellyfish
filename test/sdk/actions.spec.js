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
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')

ava.test.beforeEach(async (test) => {
	const backend = new Backend({
		host: process.env.TEST_DB_HOST,
		port: process.env.TEST_DB_PORT,
		database: `test_${randomstring.generate()}`
	})

	await backend.connect()
	await backend.reset()

	test.context.kernel = new Kernel(backend, {
		buckets: {
			cards: 'cards',
			requests: 'requests',
			sessions: 'sessions'
		}
	})

	await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
	await test.context.kernel.disconnect()
})

require('./actions/action-create-card')
require('./actions/action-update-card')
require('./actions/action-delete-card')
require('./actions/action-restore-card')
require('./actions/action-upsert-card')
require('./actions/action-update-email')
