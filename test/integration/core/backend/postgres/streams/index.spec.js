/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const pgp = require('pg-promise')()
const streams = require('../../../../../../lib/core/backend/postgres/streams')
const environment = require('../../../../../../lib/environment')

ava.beforeEach(async (test) => {
	const id = uuid()

	test.context.table = 'test_table'
	test.context.database = `test_streams_${id.replace(/-/g, '')}`

	test.context.context = {
		id: `TEST-STREAMS-${id}`
	}

	const bootstrapConnection = pgp({
		user: environment.postgres.user,
		password: environment.postgres.password,
		database: 'postgres',
		port: environment.postgres.port
	})

	await bootstrapConnection.any(`
		CREATE DATABASE ${test.context.database}
		OWNER = ${environment.postgres.user}`)

	await bootstrapConnection.$pool.end()
	await bootstrapConnection.$destroy()

	test.context.createConnection = async () => {
		return pgp({
			user: environment.postgres.user,
			database: test.context.database,
			password: environment.postgres.password,
			port: environment.postgres.port
		})
	}

	test.context.destroyConnection = async (connection) => {
		await connection.$pool.end()
		await connection.$destroy()
	}

	test.context.connection = await test.context.createConnection()
	await test.context.connection.any(`
		CREATE TABLE IF NOT EXISTS ${test.context.table} (
			id UUID PRIMARY KEY NOT NULL,
			slug VARCHAR (255) UNIQUE NOT NULL
		)`)
})

ava.afterEach(async (test) => {
	await test.context.destroyConnection(test.context.connection)
	test.context.connection = null
})

ava('should be able to setup and teardown', async (test) => {
	await test.notThrowsAsync(async () => {
		const instance = await streams.setup(
			test.context.context, test.context.connection, test.context.table)
		await streams.teardown(
			test.context.context, test.context.connection, instance)
	})
})

ava('should be able to create two instances on the same connection', async (test) => {
	await test.notThrowsAsync(async () => {
		const instance1 = await streams.setup(
			test.context.context, test.context.connection, test.context.table)
		const instance2 = await streams.setup(
			test.context.context, test.context.connection, test.context.table)
		await streams.teardown(
			test.context.context, test.context.connection, instance1)
		await streams.teardown(
			test.context.context, test.context.connection, instance2)
	})
})

ava('should be able to create two instances different connections', async (test) => {
	const connection1 = await test.context.createConnection()
	const connection2 = await test.context.createConnection()

	await test.notThrowsAsync(async () => {
		const instance1 = await streams.setup(
			test.context.context, connection1, test.context.table)
		const instance2 = await streams.setup(
			test.context.context, connection2, test.context.table)
		await streams.teardown(
			test.context.context, connection1, instance1)
		await streams.teardown(
			test.context.context, connection2, instance2)
	})

	await test.context.destroyConnection(connection1)
	await test.context.destroyConnection(connection2)
})

ava('should survive parallel setups', async (test) => {
	const run = async () => {
		await Bluebird.delay(_.random(0, 1000))
		const connection = await test.context.createConnection()
		const instance = await streams.setup(
			test.context.context, connection, test.context.table)
		await Bluebird.delay(_.random(0, 1000))
		await streams.teardown(
			test.context.context, connection, instance)
		await Bluebird.delay(_.random(0, 1000))
		await test.context.destroyConnection(connection)
	}

	await test.notThrowsAsync(async () => {
		await Bluebird.all([
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run(),
			run()
		])
	})
})
