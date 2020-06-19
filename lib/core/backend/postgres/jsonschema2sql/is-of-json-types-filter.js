/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgFormat = require('pg-format')
const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the type of a JSON property is one of the accepted
 * types.
 */
module.exports = class IsOfJsonTypesFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {Array} types - Array of accepted JSON types.
	 */
	constructor (path, types) {
		super()

		this.field = path.toSql()
		this.types = types.map((type) => {
			return pgFormat.literal(type)
		})
	}

	toSqlInto (builder) {
		builder.pushInvoked('jsonb_typeof', this.field)
		if (this.types.length === 1) {
			builder.push(' = ')
			builder.push(this.types[0])
		} else {
			builder.push(' IN ')
			builder.pushParenthisedList(this.types)
		}
	}
}
