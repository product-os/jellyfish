/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgFormat = require('pg-format')
const SqlFilter = require('./sql-filter')
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
		const alias = pgFormat.ident(this.path.getLast())
		const field = this.path.toSql(builder.getTable())
		const unnest = this.path.isProcessingJsonProperty ? 'jsonb_array_elements' : 'unnest'

		const context = builder.getContext()
		context.pushTable(alias)
		builder
			.push('EXISTS ')
			.extendParenthisedFrom(
				new SqlSelectBuilder()
					.pushFrom(`${unnest}(${field})`, alias)
					.setFilter(this.filter)
			)
		context.popTable()
	}
}
