#!/usr/bin/env node

const pgp = require('@balena/jellyfish-core/build/backend/postgres/pg-promise').default
const Bluebird = require('bluebird')
const Spinner = require('cli-spinner').Spinner
const environment = require('@balena/jellyfish-environment').defaultEnvironment

const scrub = async () => {
	const spinner = new Spinner('%s Connecting to postgres')

	const connection = pgp({
		user: environment.postgres.user,
		password: environment.postgres.password,
		database: 'postgres',
		host: environment.postgres.host,
		port: environment.postgres.port
	})

	try {
		await connection.query('select version()')
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
