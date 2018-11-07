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

const marky = require('marky')
const helpers = require('../../test/unit/core/helpers')
const utils = require('../utils')

const test = {
	context: {}
}

const run = async () => {
	await helpers.kernel.beforeEach(test)

	for (let times = 0; times < 100; times++) {
		const name = `Card ${times}`
		marky.mark(name)

		await test.context.kernel.insertCard(test.context.kernel.sessions.admin, test.context.kernel.defaults({
			type: 'card',
			version: '1.0.0',
			data: {
				count: times
			}
		}))

		marky.stop(name)
	}

	await helpers.kernel.afterEach(test)
	const entries = marky.getEntries()
	utils.logSummary(entries, 'insert serial')
}

run()
