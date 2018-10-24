#!/usr/bin/env node

const Promise = require('bluebird')
const rethinkdb = require('rethinkdb')

const reset = async () => {
	const connection = await rethinkdb.connect(this.options)

	const list = await rethinkdb
		.dbList()
		.run(connection)

	await Promise.map(list, (database) => {
		// This is a special database
		if (database === 'rethinkdb') {
			return null
		}

		return rethinkdb.dbDrop(database).run(connection).then(() => {
			console.log(`Dropped database ${database}`)
		})
	}, {
		concurrency: 10
	})

	console.log('Done')
	connection.close()
}

reset()
