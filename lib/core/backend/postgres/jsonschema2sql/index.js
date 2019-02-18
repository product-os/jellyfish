/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const keywords = require('./keywords')

/*
 * See https://www.postgresql.org/docs/9.6/functions-json.html for reference.
 */

const walk = (schema, path, context) => {
	if (!schema) {
		return false
	}

	const result = []

	for (const [ key, value ] of Object.entries(schema)) {
		// Ignore special and unrecognized keywords
		if (key.startsWith('$$') || !keywords[key]) {
			continue
		}

		const conjunct = keywords[key](
			value, path, walk, schema, context)
		result.push(conjunct)
	}

	return builder.and(...result)
}

module.exports = (table, schema, options = {}) => {
	let query = [
		`SELECT * FROM ${table}`
	]

	if (_.isBoolean(schema)) {
		if (!schema) {
			query.push('WHERE false')
		}

		return query.join('\n')
	}

	if (!_.isPlainObject(schema)) {
		throw new Error(`schema should be an object, received: ${schema}`)
	}

	const filter = [ walk(schema, [ table ]) ]

	if (!Array.isArray(filter) || filter.length > 0) {
		filter.unshift('WHERE')
		query = query.concat(filter)
	}

	if (options.sortBy) {
		const order = _.castArray(options.sortBy)

		const orderBy = [
			'ORDER BY',
			builder.getProperty([ null ].concat(order)),
			options.sortDir === 'desc' ? 'DESC' : 'ASC'
		].join(' ')

		query.push(orderBy)
	}

	if (options.skip) {
		if (!_.isNumber(options.skip)) {
			throw new Error(`options.skip should be a number, received: ${options.skip}`)
		}
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		if (!_.isNumber(options.limit)) {
			throw new Error(`options.limit should be a number, received: ${options.limit}`)
		}
		query.push(`LIMIT ${options.limit}`)
	}

	return query.join('\n')
}
