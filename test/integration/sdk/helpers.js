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

const helpers = require('../server/helpers')
const {
	getSdk
} = require('../../../lib/sdk')

exports.sdk = {
	beforeEach: async (test) => {
		await helpers.server.beforeEach(test)

		// Since AVA tests are running concurrently, set up an SDK instance that will
		// communicate with whichever port this server instance bound to
		test.context.sdk = getSdk({
			apiPrefix: process.env.API_PREFIX || 'api/v2',
			apiUrl: `http://localhost:${test.context.server.port}`
		})
	},

	afterEach: async (test) => {
		test.context.sdk.cancelAllStreams()
		test.context.sdk.cancelAllRequests()
		await helpers.server.afterEach(test)
	}
}
