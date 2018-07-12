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
const utils = require('./utils')

const USERNAME = 'user-stress-testerxxxx'
const PASSWORD = '1234'
const TIMES = 5

const run = async () => {
	const session = await utils.getSession(USERNAME, PASSWORD)
	const user = await utils.getUser(session, USERNAME)
	console.log(`Logged in as ${user.slug} (${user.id})`)

	const thread = await utils.createCard(session, 'thread', {
		data: {
			description: 'Test Thread'
		}
	})

	console.log(`Created thread ${thread.id}`)

	for (let times = 0; times < TIMES; times++) {
		const name = `Message ${times}`
		marky.mark(name)

		const message = await utils.createEvent(session, 'message', user.id, thread.id, {
			message: 'Hello World'
		})

		marky.stop(name)

		console.log(`Created message ${message.id}`)
	}

	const entries = marky.getEntries()

	utils.logSummary(entries)
}

run().catch((error) => {
	console.error(error)
	process.exit(1)
})
