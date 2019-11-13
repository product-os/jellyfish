/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const cards = require('./cards')
const utils = require('./utils')

exports.setup = async (context, connection, options) => {
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
	return connection.any({
		name: `queue-remove-${options.table}`,
		text: `DELETE FROM ${options.table} WHERE id = $1`,
		values: [ id ]
	})
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

	const elements = await connection.any(query.join('\n'))
	_.forEach(elements, utils.convertDatesToISOString)
	return elements
}

exports.getCount = async (connection, options = {}) => {
	const result = await connection.any(
		`SELECT COUNT (id) FROM ${options.table}`)
	return _.parseInt(result[0].count)
}
