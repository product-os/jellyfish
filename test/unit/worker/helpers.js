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

const Queue = require('../../../lib/queue')
const Worker = require('../../../lib/worker')
const helpers = require('../core/helpers')

exports.jellyfish = {
	beforeEach: async (test) => {
		await helpers.jellyfish.beforeEach(test)
		test.context.session = test.context.jellyfish.sessions.admin

		const session = await test.context.jellyfish.getCardById(test.context.context,
			test.context.session, test.context.session, {
				type: 'session'
			})

		test.context.actor = await test.context.jellyfish.getCardById(test.context.context,
			test.context.session, session.data.actor, {
				type: 'user'
			})

		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/execute.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/create.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/update.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/message.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/account.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/triggered-action.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-create-card.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-create-event.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-set-add.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-create-user.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-create-session.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-update-card.json'))
		await test.context.jellyfish.insertCard(test.context.context, test.context.session,
			require('../../../default-cards/contrib/action-delete-card.json'))
	},

	afterEach: async (test) => {
		await helpers.jellyfish.afterEach(test)
	}
}

exports.worker = {
	beforeEach: async (test, actionLibrary) => {
		await exports.jellyfish.beforeEach(test)

		test.context.queue = new Queue(
			test.context.context,
			test.context.jellyfish,
			test.context.session)
		test.context.worker = new Worker(
			test.context.jellyfish,
			test.context.session,
			actionLibrary,
			test.context.queue)
		test.context.flush = async (session) => {
			if (await test.context.queue.length() === 0) {
				return
			}

			const request = await test.context.worker.dequeue()
			const result = await test.context.worker.execute(session, request)

			if (result.error) {
				const Constructor = test.context.worker.errors[result.data.name] ||
					test.context.jellyfish.errors[result.data.name] ||
					Error

				throw new Constructor(result.data.message)
			}

			await test.context.flush(session)
		}
	},
	afterEach: exports.jellyfish.afterEach
}
