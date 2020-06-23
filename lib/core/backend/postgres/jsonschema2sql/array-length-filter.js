/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the array length of a field is related to a constant
 * number by an operator.
 */
module.exports = class ArrayLengthFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} operator - The operator to test the array length of
	 *        `path` against `value`.
	 * @param {Number} value - A constant to test the array length of `path`
	 *        against.
	 */
	constructor (path, operator, value) {
		super()

		this.cardinality = path.isProcessingJsonProperty ? 'jsonb_array_length' : 'cardinality'
		this.field = path.toSql()
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		builder
			.pushInvoked(this.cardinality, this.field)
			.pushSpaced(this.operator)
			.push(this.value)
	}
}
