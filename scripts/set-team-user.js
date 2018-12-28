#!/usr/bin/env node

const rethinkdb = require('rebirthdb-js')({
	pool: false,
	timeoutError: 2000
})

const run = async () => {
	const connection = await rethinkdb.connect()
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
		.run(connection)

	console.log(`Gave ${userSlug} the user-team role`)

	await connection.close()
}

run()
