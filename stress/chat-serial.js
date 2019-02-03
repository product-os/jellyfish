/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
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
