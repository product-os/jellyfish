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
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} operator - The operator to test `path` against `value`.
	 * @param {any} value - A constant to test `path` against.
	 * @param {String} cast - An optional type that both `path` and `value`
	 *        must be cast into before comparison.
	 */
	constructor (path, operator, value, cast) {
		super()

		this.path = path.cloned()
		this.operator = operator
		this.value = value
		this.cast = cast
	}

	toSqlInto (builder) {
		if (this.cast) {
			const field = this.path.toSql(builder.getTable(), {
				asText: true
			})
			builder
				.pushCasted(field, this.cast)
				.pushSpaced(this.operator)
				.pushCasted(pgFormat.literal(this.value), this.cast)
		} else {
			builder
				.extendFrom(this.path)
				.pushSpaced(this.operator)
				.push(SqlFilter.maybeJsonLiteral(this.path, this.value))
		}
	}
}
