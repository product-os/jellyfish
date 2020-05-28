/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')

/**
 * @summary Prepare a Postgres to_tsvector function call for full-text search
 * @function
 *
 * @param {String} table - table name
 * @param {Array} path - path to field
 * @param {Boolean} isRootArray - denotes if Postgres text[] column
 * @returns {String} to_tsvector function call
 *
 * @example
 * const table = 'cards'
 * const path = [ 'data', 'payload', 'message' ]
 * const isRootTextArray = false
 * const result = exports.toTSVector(table, path, isRootTextArray)
 */
exports.toTSVector = (table, path, isRootArray) => {
	const keys = _.clone(path)

	// Non-JSONB arrays need to be joined into a string before tokenization
	if (keys.length === 1) {
		const selector = `${table}.${keys.shift()}`
		if (isRootArray) {
			return `to_tsvector('english', immutable_array_to_string(${selector}, ' '))`
		}
		return `to_tsvector('english', ${selector})`
	}

	// Anything under data can be handled with jsonb_to_tsvector
	return `jsonb_to_tsvector('english', ${table}.${keys.shift()}#>'{${keys.join(',')}}', '["string"]')`
}

/**
 * @summary Prepare a Postgres tsquery function call for full-text search
 * @function
 *
 * @param {String} term - term to search for
 * @returns {String} tsquery function call
 *
 * @example
 * const term = 'test'
 * const result = exports.toTSQuery(term)
 */
exports.toTSQuery = (term) => {
	return `plainto_tsquery('english', ${pgFormat.literal(term)})`
}
