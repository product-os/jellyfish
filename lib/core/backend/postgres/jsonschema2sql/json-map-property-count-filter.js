/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the number of properties of a JSON field is related to
 * a constant number by an operator.
 */
module.exports = class JsonMapPropertyCountFilter extends SqlFilter {
	constructor (query, operator, value) {
		super()

		this.field = query.pathToSqlField()
		this.operator = operator
		this.value = value
	}

	toSqlInto (builder) {
		builder.push('cardinality(array(SELECT jsonb_object_keys(')
		builder.push(this.field)
		builder.push(')))')
		builder.pushSpaced(this.operator)
		builder.push(this.value)
	}
}
