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
	constructor (query, operator, value, cast) {
		super()

		if (cast) {
			this.field = query.pathToSqlField({
				asText: true
			})
			this.value = pgFormat.literal(value)
			this.cast = cast
		} else {
			this.field = query.pathToSqlField()
			this.value = SqlFilter.maybeJsonLiteral(query, value)
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
