#!/usr/bin/env node

const Promise = require('bluebird')
const rethinkdb = require('rethinkdb')
const Spinner = require('cli-spinner').Spinner

// Removes rethinkdb databases that are prefixed with `test_`
const scrub = async () => {
	const spinner = new Spinner('%s Connecting to RethinkDB')

	spinner.start()

	const connection = await rethinkdb.connect(this.options)

	const list = await rethinkdb
		.dbList()
		.run(connection)

	const testDatabases = list.filter(x => x.match(/test_/))

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

	connection.close()
}

scrub()
