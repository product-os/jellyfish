#!/usr/bin/env node

const Promise = require('bluebird')
const rethinkdb = require('rebirthdb-js')({
	host: process.env.DB_HOST || 'localhost'
})

const Spinner = require('cli-spinner').Spinner

// Removes rethinkdb databases that are prefixed with `test_`
const scrub = async () => {
	const spinner = new Spinner('%s Connecting to RethinkDB')

	spinner.start()

	const list = await rethinkdb
		.dbList()
		.run()

	const testDatabases = list.filter((database) => {
		return database.match(/test_/)
	})

	console.log(`found ${testDatabases.length} test databases`)

	spinner.setSpinnerTitle(`%s Preparing to drop ${testDatabases.length} test databases`)

	let count = 0

	await Promise.map(
		testDatabases,
		(database) => {
			return rethinkdb.dbDrop(database).run()
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

	await rethinkdb.getPoolMaster().drain()
}

scrub()
