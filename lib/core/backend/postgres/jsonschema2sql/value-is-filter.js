/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgFormat = require('pg-format')
const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a field, optionally cast into another
 * type, is related to a constant value by an operator.
 */
module.exports = class ValueIsFilter extends SqlFilter {
	constructor (path, operator, value, cast) {
		super()

		if (cast) {
			this.field = path.toSql({
				asText: true
			})
			this.value = pgFormat.literal(value)
			this.cast = cast
		} else {
			this.field = path.toSql()
			this.value = SqlFilter.maybeJsonLiteral(path, value)
		}
		this.operator = operator
	}

	toSqlInto (builder) {
		if (this.cast) {
			builder.pushCasted(this.field, this.cast)
			builder.pushSpaced(this.operator)
			builder.pushCasted(this.value, this.cast)
		} else {
			builder.push(this.field)
			builder.pushSpaced(this.operator)
			builder.push(this.value)
		}
	}
}
