#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('../../lib/core/backend/postgres/pg-promise')
const environment = require('@balena/jellyfish-environment')

const migrations = [
	require('./link-cards-to-relationship-cards')
]

const main = async () => {
	const connection = pgp({
		user: environment.postgres.user || process.env.USER,
		host: environment.postgres.host,
		password: environment.postgres.password,
		database: environment.postgres.database || 'jellyfish',
		port: environment.postgres.port || 5432
	})

	// Loop through each migration and run them each in their own transaction.
	migrations.forEach(async (migration) => {
		await connection.tx(async (transaction) => {
			await migration(transaction)
		})
	})

	await connection.$pool.end()
}

main()
