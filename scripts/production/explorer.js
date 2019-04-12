/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('pg-promise')()
const environment = require('../../lib/environment')

const COMMAND = process.argv[2]
const ARGUMENT = process.argv[3]

if (!COMMAND || !ARGUMENT) {
	console.error(
		`Usage: ${process.argv[0]} ${process.argv[1]} <command> <argument>`)
	process.exit(1)
}

const run = async () => {
	const connection = pgp({
		user: environment.postgres.user || process.env.USER,
		host: environment.postgres.host,
		password: environment.postgres.password,
		database: environment.postgres.database || 'jellyfish',
		port: environment.postgres.port || 5432
	})

	if (COMMAND === 'slug') {
		const results = await connection.any(`
			SELECT * FROM cards WHERE slug = $1 LIMIT 1;`, [ ARGUMENT ])
		await connection.$pool.end()
		console.log(JSON.stringify(results[0], null, 2))
		return
	}

	if (COMMAND === 'id') {
		const results = await connection.any(`
			SELECT * FROM cards WHERE id = $1 LIMIT 1;`, [ ARGUMENT ])
		await connection.$pool.end()
		console.log(JSON.stringify(results[0], null, 2))
		return
	}

	if (COMMAND === 'queue') {
		const results = await connection.any(`
			SELECT * FROM cards_queue LIMIT $1;`, [ ARGUMENT ])
		await connection.$pool.end()

		for (const row of results) {
			console.log(
				row.created_at,
				'|',
				row.slug,
				'|',
				row.data.action)
		}
	}

	console.error(`Unknown command: ${COMMAND}`)
	process.exit(1)
}

run().catch((error) => {
	console.error(error)
	process.exit(1)
})
