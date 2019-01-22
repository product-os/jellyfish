#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('pg-promise')()
const Bluebird = require('bluebird')
const Spinner = require('cli-spinner').Spinner
const environment = require('../lib/environment')

const scrub = async () => {
	const spinner = new Spinner('%s Connecting to postgres')

	const connection = pgp({
		user: environment.postgres.user,
		password: environment.postgres.password,
		database: 'postgres',
		port: environment.postgres.port
	})

	try {
		await connection.proc('version')
	} catch (error) {
		if (error.code === 'ECONNREFUSED' && error.syscall === 'connect') {
			console.log('Couldn\'t connect to Postgres')
			return
		}

		throw error
	}

	/*
	 * List all databases that start with "test_".
	 */
	const results = await connection.any(
		'SELECT datname FROM pg_database WHERE datname LIKE \'%test_%\'')

	spinner.start()
	spinner.setSpinnerTitle(
		`%s Preparing to drop ${results.length} test databases`)

	let count = 0

	/*
	 * Drop them all!
	 */
	await Bluebird.all(results.map((row) => {
		return connection.any(`DROP DATABASE ${row.datname}`).then(() => {
			spinner.setSpinnerTitle(
				`%s Dropped database ${row.datname} (${++count}/${results.length})`)
		})
	}))

	spinner.stop(true)
	console.log(`Dropped ${results.length} test databases`)

	await connection.$pool.end()
}

scrub().catch((error) => {
	console.error(error)
	process.exit(1)
})
