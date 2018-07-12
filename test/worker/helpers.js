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

const randomstring = require('randomstring')
const core = require('../../lib/core')

exports.beforeEach = async (test) => {
	test.context.jellyfish = await core.create({
		backend: {
			host: process.env.TEST_DB_HOST,
			port: process.env.TEST_DB_PORT,
			database: `test_${randomstring.generate()}`
		}
	})

	await test.context.jellyfish.initialize()
	test.context.session = test.context.jellyfish.sessions.admin

	const session = await test.context.jellyfish.getCardById(test.context.session, test.context.session)
	test.context.actor = await test.context.jellyfish.getCardById(test.context.session, session.data.actor)

	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/execute.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/create.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/update.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/triggered-action.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-card.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-event.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-set-add.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-user.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-create-session.json'))
	await test.context.jellyfish.insertCard(test.context.session,
		require('../../default-cards/contrib/action-update-card.json'))
}

exports.afterEach = async (test) => {
	await test.context.jellyfish.disconnect()
}
