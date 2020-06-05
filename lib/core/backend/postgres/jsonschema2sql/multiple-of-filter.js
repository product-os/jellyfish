/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a column is or is not null.
 */
module.exports = class MultipleOfFilter extends SqlFilter {
	constructor (path, multiple) {
		super()

		this.field = path.toSql()
		this.multiple = multiple
	}

	toSqlInto (builder) {
		builder.pushCasted(this.field, 'numeric')
		builder.push(' % ')
		builder.push(this.multiple)
		builder.push(' = 0')
	}
}
