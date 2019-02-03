#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

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
