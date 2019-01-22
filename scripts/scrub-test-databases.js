#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Promise = require('bluebird')
const rethinkdb = require('rebirthdb-js')({
	host: process.env.DB_HOST || 'localhost',
	pool: false,
	timeoutError: 2000
})

const Spinner = require('cli-spinner').Spinner

// Removes rethinkdb databases that are prefixed with `test_`
const scrub = async () => {
	const connection = await rethinkdb.connect()
	const spinner = new Spinner('%s Connecting to RethinkDB')

	spinner.start()

	const list = await rethinkdb
		.dbList()
		.run(connection)

	const testDatabases = list.filter((database) => {
		return database.match(/test_/)
	})

	console.log(`found ${testDatabases.length} test databases`)

	spinner.setSpinnerTitle(`%s Preparing to drop ${testDatabases.length} test databases`)

	let count = 0

	await Promise.map(
		testDatabases,
		(database) => {
			return rethinkdb.dbDrop(database).run(connection)
				.then(() => {
					spinner.setSpinnerTitle(`%s Dropped database ${database} (${++count}/${testDatabases.length})`)
				})
		},
		{
			concurrency: 10
		}
	)

	spinner.stop(true)
	console.log(`Dropped ${testDatabases.length} test databases`)

	await connection.close()
}

scrub()
