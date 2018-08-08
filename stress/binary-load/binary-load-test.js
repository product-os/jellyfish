#!/usr/bin/env node

const randomString = require('randomstring')
const rethinkdb = require('rethinkdb')
const marky = require('marky')
const utils = require('../utils')
const fs = require('fs')
const path = require('path')

const file = fs.readFileSync(path.resolve(__dirname, 'output-1m.dat'))

const total = 100
const documentStaturation = 0.1

const run = async () => {
	const connection = await rethinkdb.connect()
	const database = `test_binary_load_${randomString.generate()}`

	await rethinkdb
		.dbCreate(database)
		.run(connection)

	const useFile = process.env.USE_FILE

	await rethinkdb
		.db(database)
		.tableCreate('test')
		.run(connection)

	for (let identifier = 0; identifier < total; identifier++) {
		const addFile = useFile && identifier < total * documentStaturation

		await rethinkdb
			.db(database)
			.table('test')
			.insert({
				id: identifier,
				data: {
					sibling: identifier + 1,
					file: addFile ? file : null
				}
			})
			.run(connection)
	}

	for (let sibling = 1; sibling <= total; sibling++) {
		marky.mark(sibling)

		await rethinkdb
			.db(database)
			.table('test')
			.filter({
				data: {
					sibling
				}
			})
			.run(connection)

		marky.stop(sibling)
	}

	const entries = marky.getEntries()
	utils.logSummary(entries, 'Binary load test')

	await rethinkdb.dbDrop(database).run(connection)

	connection.close()
}

run()
