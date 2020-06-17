/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')
const SqlSelectBuilder = require('./builder/select')

/**
 * Filter asserting that the an array contains at least one element with which
 * another filter evaluates to true.
 */
module.exports = class ArrayContainsFilter extends SqlFilter {
	/**
     * Constructor.
     *
     * @param {SqlPath} path - Path to be tested.
     * @param {SqlFilter} filter - Filter to test elements against.
     * @param {String} alias - Name of the table `filter` refers to.
     */
	constructor (path, filter, alias) {
		super()

		this.field = path.toSql()
		this.unnest = path.isProcessingJsonProperty ? 'jsonb_array_elements' : 'unnest'
		this.alias = alias
		this.filter = filter
	}

	toSqlInto (builder) {
		builder.push('EXISTS (')
		new SqlSelectBuilder()
			.pushFrom(`${this.unnest}(${this.field})`, this.alias)
			.setFilter(this.filter)
			.toSqlInto(builder)
		builder.push(')')
	}
}
