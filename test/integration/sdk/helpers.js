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

require('ts-node').register()

const Bluebird = require('bluebird')
const helpers = require('../server/helpers')
const {
	getSdk
} = require('../../../lib/sdk')

const WAIT_TIMEOUT = 60 * 1000

exports.sdk = {
	beforeEach: async (test) => {
		await helpers.server.beforeEach(test)

		// Since AVA tests are running concurrently, set up an SDK instance that will
		// communicate with whichever port this server instance bound to
		test.context.sdk = getSdk({
			apiPrefix: process.env.API_PREFIX || 'api/v2',
			apiUrl: `http://localhost:${test.context.server.port}`
		})

		test.context.executeThenWait = async (asyncFn, waitQuery) => {
			const stream = await test.context.sdk.stream(waitQuery)

			return new Bluebird((resolve, reject) => {
				const timeout = setTimeout(() => {
					stream.destroy()
					reject(new Error(`Did not receive any data after ${WAIT_TIMEOUT}ms`))
				}, WAIT_TIMEOUT)

				stream.on('update', (update) => {
					if (update.data.after) {
						resolve(update.data.after)
						clearTimeout(timeout)
						stream.destroy()
					}
				})

				stream.on('streamError', (error) => {
					reject(error.data)
					clearTimeout(timeout)
					stream.destroy()
				})

				asyncFn().catch((error) => {
					reject(error)
					clearTimeout(timeout)
					stream.destroy()
				})
			})
		}
	},

	afterEach: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
		await helpers.server.afterEach(test)
	}
}
