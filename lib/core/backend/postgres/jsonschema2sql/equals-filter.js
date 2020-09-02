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
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {Array} values - Array of values to test `path` against.
	 */
	constructor (path, values) {
		super()

		this.path = path.cloned()
		this.values = values
	}

	toSqlInto (builder) {
		let canBeSqlNull = false
		const textValues = []
		const nonTextValues = []
		for (const value of this.values) {
			if (value === null && !this.path.isProcessingJsonProperty) {
				canBeSqlNull = true
			} else if (_.isString(value)) {
				textValues.push(pgFormat.literal(value))
			} else {
				nonTextValues.push(SqlFilter.maybeJsonLiteral(this.path, value))
			}
		}

		const filter = new ExpressionFilter(false)
		if (canBeSqlNull) {
			filter.or(new IsNullFilter(this.path, true))
		}
		if (textValues.length > 0) {
			let innerFilter = null
			if (textValues.length === 1) {
				innerFilter = new IsEqualFilter(this.path, true, textValues[0])
			} else {
				innerFilter = new IsInFilter(this.path, true, textValues)
			}
			filter.or(innerFilter)
		}
		if (nonTextValues.length > 0) {
			let innerFilter = null
			if (nonTextValues.length === 1) {
				innerFilter = new IsEqualFilter(this.path, false, nonTextValues[0])
			} else {
				innerFilter = new IsInFilter(this.path, false, nonTextValues)
			}
			filter.or(innerFilter)
		}

		builder.extendFrom(filter)
	}
}

class IsEqualFilter extends SqlFilter {
	constructor (path, asText, value) {
		super()

		this.path = path
		this.asText = asText
		this.value = value
	}

	toSqlInto (builder) {
		const options = this.asText ? {
			asText: true
		} : {}
		builder
			.push(this.path.toSql(builder.getTable(), options))
			.push(' = ')
			.push(this.value)
	}
}

class IsInFilter extends SqlFilter {
	constructor (path, asText, values) {
		super()

		this.path = path
		this.asText = asText
		this.values = values
	}

	toSqlInto (builder) {
		const options = this.asText ? {
			asText: true
		} : {}
		builder
			.push(this.path.toSql(builder.getTable(), options))
			.push(' IN ')
			.pushParenthisedList(this.values)
	}
}
