/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that another filter is false.
 */
module.exports = class NotFilter extends SqlFilter {
	/**
     * Constructor.
     *
     * @param {SqlFilter} filter - The filter to negate. This constructor
	 *        assumes ownership of the filter.
     */
	constructor (filter) {
		super()

		this.filter = filter
	}

	toSqlInto (builder) {
		builder.push('NOT (')
		this.filter.toSqlInto(builder)
		builder.push(')')
	}
}
