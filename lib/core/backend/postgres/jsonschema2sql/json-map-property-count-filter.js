/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the number of properties of a JSON field is related to
 * a constant number by an operator.
 */
module.exports = class JsonMapPropertyCountFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} operator - The operator to test the number of
	 *        properties in `path` against `value`.
	 * @param {Number} value - A constant to test the number of properties in
	 *        `path` against.
	 */
	constructor (path, operator, value) {
		super()

		this.field = path.toSql()
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		builder
			.push('cardinality(array(SELECT jsonb_object_keys(')
			.push(this.field)
			.push(')))')
			.pushSpaced(this.operator)
			.push(this.value)
	}
}
