#!/usr/bin/env node

/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('pg-promise')()
const fs = require('fs')
const _ = require('lodash')
const Bluebird = require('bluebird')
const JSONStream = require('JSONStream')
const environment = require('../lib/environment')

const FILE = process.argv[2]
if (!FILE) {
	console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <file>`)
	process.exit(1)
}

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

	console.log('GOT', object.slug, JSON.stringify(object).length)
	jsonStream.pause()

	const payload = [
		object.id,
		object.slug,
		object.type,
		object.active,
		object.version || '1.0.0',
		typeof object.name === 'string'
			? object.name
			: null,
		object.tags || [],
		object.markers || [],
		object.created_at || new Date().toISOString(),
		object.links || {},
		object.requires || [],
		object.capabilities || [],
		object.data || {}
	]

	connection.any(`
		INSERT INTO cards VALUES ($1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11, $12, $13)
		ON CONFLICT (slug) DO UPDATE SET
			id = cards.id,
			active = $4,
			version = $5,
			name = $6,
			tags = $7,
			markers = $8,
			created_at = $9,
			links = $10,
			requires = $11,
			capabilities = $12,
			data = $13
		RETURNING *`, payload).then((results) => {
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
