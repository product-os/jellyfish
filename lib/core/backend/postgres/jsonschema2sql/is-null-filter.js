/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a field is or is not SQL `NULL`.
 */
module.exports = class IsNullFilter extends SqlFilter {
	/**
     * Constructor.
     *
     * @param {SqlPath} path - Path to be tested.
	 * @param {Boolean} isNull - Whether `path` must be `NULL`, or must not be
	 *        `NULL`.
     */
	constructor (path, isNull) {
		super()

		this.field = path.toSql()
		this.isNull = isNull
	}

	toSqlInto (builder) {
		const tail = this.isNull ? ' IS NULL' : ' IS NOT NULL'

		builder.push(this.field)
		builder.push(tail)
	}
}
