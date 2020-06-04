/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the array length of a field is related to a constant
 * number by an operator.
 */
module.exports = class ArrayLengthFilter extends SqlFilter {
	constructor (query, operator, value) {
		super()

		this.cardinality = query.isProcessingJsonProperty ? 'jsonb_array_length' : 'cardinality'
		this.field = query.pathToSqlField()
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		builder.pushInvoked(this.cardinality, this.field)
		builder.pushSpaced(this.operator)
		builder.push(this.value)
	}
}
