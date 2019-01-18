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

const Worker = require('../../../lib/worker')
const helpers = require('../queue/helpers')

exports.jellyfish = {
	beforeEach: async (test) => {
		await helpers.jellyfish.beforeEach(test)
	},

	afterEach: async (test) => {
		await helpers.jellyfish.afterEach(test)
	}
}

exports.worker = {
	beforeEach: async (test, actionLibrary) => {
		await helpers.queue.beforeEach(test)
		test.context.worker = new Worker(
			test.context.jellyfish,
			test.context.session,
			actionLibrary,
			test.context.queue)

		test.context.flush = async (session) => {
			if (await test.context.queue.length() === 0) {
				return
			}

			const request = await test.context.queue.dequeue()
			const result = await test.context.worker.execute(session, request)

			if (result.error) {
				const Constructor = test.context.worker.errors[result.data.name] ||
					test.context.queue.errors[result.data.name] ||
					test.context.jellyfish.errors[result.data.name] ||
					Error

				throw new Constructor(result.data.message)
			}

			await test.context.flush(session)
		}
	},
	afterEach: helpers.queue.afterEach
}
