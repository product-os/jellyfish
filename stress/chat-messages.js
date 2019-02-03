/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const marky = require('marky')
const utils = require('./utils')

const USERNAME = 'user-stress-tester'
const PASSWORD = '1234'

const run = async () => {
	const session = await utils.getSession(USERNAME, PASSWORD)
	const user = await utils.getUser(session, USERNAME)
	console.log(`Logged in as ${user.slug} (${user.id})`)

	for (let times = 0; times < 10; times++) {
		marky.mark(String(times))
		const results = await utils.query(session, {
			type: 'object',
			required: [ 'type' ],
			additionalProperties: true,
			properties: {
				type: {
					type: 'string',
					const: 'message'
				}
			}
		})

		marky.stop(String(times))
		console.log(`Queried all messages, got ${results.length}`)
	}

	const entries = marky.getEntries()

	console.log('\n==== ENTRIES\n')
	entries.forEach((entry) => {
		console.log(`${entry.name}: ${entry.duration}`)
	})

	console.log('\n==== SUMMARY\n')
	const durations = _.map(entries, 'duration')
	console.log(`Min: ${_.min(durations)}`)
	console.log(`Max: ${_.max(durations)}`)
	console.log(`Avg: ${_.sum(durations) / durations.length}`)
}

run().catch((error) => {
	console.error(error)
	process.exit(1)
})
