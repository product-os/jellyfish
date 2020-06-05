/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const ExpressionFilter = require('./expression-filter')
const IsNullFilter = require('./is-null-filter')
const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that the value of a field is equal to one or more possible
 * values.
 */
module.exports = class EqualsFilter extends SqlFilter {
	constructor (path, values) {
		super()

		let canBeSqlNull = false
		const textValues = []
		const nonTextValues = []
		for (const value of values) {
			if (value === null && !path.isProcessingJsonProperty) {
				canBeSqlNull = true
			} else if (_.isString(value)) {
				textValues.push(pgFormat.literal(value))
			} else {
				nonTextValues.push(SqlFilter.maybeJsonLiteral(path, value))
			}
		}

		this.filter = new ExpressionFilter(false)
		if (canBeSqlNull) {
			this.filter.or(new IsNullFilter(path, true))
		}
		if (textValues.length > 0) {
			const field = path.toSql({
				asText: true
			})

			let filter = null
			if (textValues.length === 1) {
				filter = new IsEqualFilter(field, textValues[0])
			} else {
				filter = new IsInFilter(field, textValues)
			}
			this.filter.or(filter)
		}
		if (nonTextValues.length > 0) {
			const field = path.toSql()

			let filter = null
			if (nonTextValues.length === 1) {
				filter = new IsEqualFilter(field, nonTextValues[0])
			} else {
				filter = new IsInFilter(field, nonTextValues)
			}
			this.filter.or(filter)
		}
	}

	toSqlInto (builder) {
		this.filter.toSqlInto(builder)
	}
}

class IsEqualFilter extends SqlFilter {
	constructor (field, value) {
		super()

		this.field = field
		this.value = value
	}

	toSqlInto (builder) {
		builder.push(this.field)
		builder.push(' = ')
		builder.push(this.value)
	}
}

class IsInFilter extends SqlFilter {
	constructor (field, values) {
		super()

		this.field = field
		this.values = values
	}

	toSqlInto (builder) {
		builder.push(this.field)
		builder.push(' IN ')
		builder.pushParenthisedList(this.values)
	}
}
