/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const cards = require('./cards')

exports.setup = async (context, connection, options) => {
	// TODO: For migration purposes. We can delete after
	// this is deployed for the first time.
	await connection.any(
		'DROP MATERIALIZED VIEW IF EXISTS cards_queue')

	await cards.setup(context, connection, options.table, {
		table: options.table,
		noIndexes: true
	})
}

exports.add = async (context, errors, connection, card, options) => {
	return cards.upsert(context, errors, connection, card, {
		id: card.id,
		table: options.table,
		replace: true
	})
}

exports.remove = async (context, connection, id, options) => {
	return connection.any(
		`DELETE FROM ${options.table} WHERE id = '${id}'`)
}

exports.getElements = async (context, connection, options = {}) => {
	const query = [
		`SELECT * FROM ${options.table}`
	]

	if (options.skip) {
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		query.push(`LIMIT ${options.limit}`)
	}

	return connection.any(query.join('\n'))
}

exports.getCount = async (connection, options = {}) => {
	const result = await connection.any(
		`SELECT COUNT (id) FROM ${options.table}`)
	return _.parseInt(result[0].count)
}
