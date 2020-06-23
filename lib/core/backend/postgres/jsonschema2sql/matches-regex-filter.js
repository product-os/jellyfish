/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgFormat = require('pg-format')
const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a column, as a string, matches a regular
 * expression.
 */
module.exports = class MatchesRegexFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} regex - An SQL-compatible regex to test `path` against.
	 * @param {Object} flags - An optional object containing extra flags.
	 *        Accepted flags are:
	 *        - `ignoreCase`: perform a case-insensitive regex matching.
	 */
	constructor (path, regex, flags = {}) {
		super()

		this.field = path.toSql({
			asText: true
		})
		this.operator = flags.ignoreCase ? '~*' : '~'
		this.regex = pgFormat.literal(regex)
	}

	toSqlInto (builder) {
		builder
			.push(this.field)
			.pushSpaced(this.operator)
			.push(this.regex)
	}
}
