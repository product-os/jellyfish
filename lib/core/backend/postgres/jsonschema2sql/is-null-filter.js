/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a field is or is not SQL null.
 */
module.exports = class IsNullFilter extends SqlFilter {
	constructor (query, isNull) {
		super()

		this.field = query.pathToSqlField()
		this.isNull = isNull
	}

	toSqlInto (builder) {
		const tail = this.isNull ? ' IS NULL' : ' IS NOT NULL'

		builder.push(this.field)
		builder.push(tail)
	}
}
