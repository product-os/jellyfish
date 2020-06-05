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
	constructor (path, regex, flags = {}) {
		super()

		this.field = path.toSql({
			asText: true
		})
		this.operator = flags.ignoreCase ? '~*' : '~'
		this.regex = pgFormat.literal(regex)
	}

	toSqlInto (builder) {
		builder.push(this.field)
		builder.pushSpaced(this.operator)
		builder.push(this.regex)
	}
}
