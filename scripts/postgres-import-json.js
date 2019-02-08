#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('pg-promise')()
const fs = require('fs')
const _ = require('lodash')
const path = require('path')
const Bluebird = require('bluebird')
const JSONStream = require('JSONStream')
const environment = require('../lib/environment')

const FILE = process.argv[2]
if (!FILE) {
	console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <file>`)
	process.exit(1)
}

const table = path.basename(FILE, path.extname(FILE))
const JSON_COLUMN = 'card_data'

const onError = (error) => {
	console.error(error)
	process.exit(1)
}

const connection = pgp({
	user: environment.postgres.user,
	password: environment.postgres.password,
	database: 'jellyfish',
	port: environment.postgres.port
})

const readStream = fs.createReadStream(FILE)
const jsonStream = JSONStream.parse('*')

readStream.once('error', onError)
jsonStream.once('error', onError)

let count = 0

jsonStream.on('data', (object) => {
	if (object.type === 'link') {
		object.links = {}

		if (_.isString(object.data.from) && !object.data.fromType) {
			object.data.fromType = 'card'
		}

		if (_.isString(object.data.to) && !object.data.toType) {
			object.data.toType = 'card'
		}
	}

	const payload = JSON.stringify(object)

	if (object.type === 'create') {
		Reflect.deleteProperty(object.data, 'payload')
	}

	console.log('GOT', object.slug, payload.length)
	jsonStream.pause()

	connection.any(`
		INSERT INTO ${table} VALUES ($1, $2, $3, $4)
		ON CONFLICT (slug)
		DO
			UPDATE
				SET ${JSON_COLUMN} = $4::jsonb || jsonb_build_object('id', ${table}.${JSON_COLUMN}->'id')
		RETURNING *
	`, [
		object.id,
		object.slug,
		object.type,
		object
	]).then((results) => {
		count++
		jsonStream.resume()
	}).catch((error) => {
		console.error('Insert error')
		return onError(error)
	})
})

readStream.pipe(jsonStream)

jsonStream.on('end', () => {
	return Bluebird.delay(10000).then(() => {
		return connection.$pool.end()
	}).then(() => {
		console.log(`Done! Inserted ${count} cards`)
		process.exit(0)
	}).catch(onError)
})
