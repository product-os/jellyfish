/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')
const SqlFragmentBuilder = require('./fragment-builder')
const SqlSelectBuilder = require('./select-builder')

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
	 */
	constructor (path, filter) {
		super()

		this.path = path.cloned()
		this.filter = filter
	}

	toSqlInto (builder) {
		const subBuilder = new SqlFragmentBuilder('items')
		const field = this.path.toSql(builder.getTable())
		const unnest = this.path.isProcessingJsonProperty ? 'jsonb_array_elements' : 'unnest'
		subBuilder
			.push('EXISTS ')
			.extendParenthisedFrom(
				new SqlSelectBuilder()
					.pushFrom(`${unnest}(${field})`, 'items')
					.setFilter(this.filter)
			)

		builder.extendFrom(subBuilder)
	}
}
