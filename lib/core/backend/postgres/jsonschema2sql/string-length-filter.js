/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the string length of a field is related to a constant
 * number by an operator.
 */
module.exports = class StringLengthFilter extends SqlFilter {
	constructor (path, operator, value) {
		super()

		this.field = path.toSql({
			asText: true
		})
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		builder.pushInvoked('char_length', this.field)
		builder.pushSpaced(this.operator)
		builder.push(this.value)
	}
}
