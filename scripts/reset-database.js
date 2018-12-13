#!/usr/bin/env node

const Promise = require('bluebird')
const rethinkdb = require('rebirthdb-js')()

const reset = async () => {
	const list = await rethinkdb
		.dbList()
		.run()

	await Promise.map(list, (database) => {
		// This is a special database
		if (database === 'rethinkdb') {
			return null
		}

		return rethinkdb.dbDrop(database).run().then(() => {
			console.log(`Dropped database ${database}`)
		})
	}, {
		concurrency: 10
	})

	console.log('Done')
	await rethinkdb.getPoolMaster().drain()
}

reset()
