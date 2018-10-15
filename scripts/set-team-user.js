#!/usr/bin/env node

const rethinkdb = require('rethinkdb')

const run = async () => {
	const connection = await rethinkdb.connect(this.options)

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

	connection.close()
}

run()
