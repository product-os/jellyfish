#!/usr/bin/env node

const rethinkdb = require('rebirthdb-js')()

const run = async () => {
	const userSlug = process.argv[process.argv.length - 1]

	await rethinkdb
		.db('jellyfish')
		.table('cards')
		.filter({
			slug: userSlug
		})
		.update({
			data: {
				roles: [ 'user-team' ]
			}
		})
		.run()

	console.log(`Gave ${userSlug} the user-team role`)

	await rethinkdb.getPoolMaster().drain()
}

run()
