/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the string length of a field is related to a constant
 * number by an operator.
 */
module.exports = class StringLengthFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} operator - The operator to test the string length of
	 *        `path` against `value`.
	 * @param {Number} value - A constant to test the string length of `path`
	 *        against.
	 */
	constructor (path, operator, value) {
		super()

		this.path = path.cloned()
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		const field = this.path.toSql(builder.getTable(), {
			asText: true
		})
		builder
			.pushInvoked('char_length', field)
			.pushSpaced(this.operator)
			.push(this.value)
	}
}
