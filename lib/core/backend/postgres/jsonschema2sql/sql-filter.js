/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const pgFormat = require('pg-format')

/**
 * Base class for SQL boolean expressions, aka filters, constraints, or
 * conditions.
 */
module.exports = class SqlFilter {
	/**
     * Format `value` as either a Postgres JSON literal, or an SQL literal
     * depending on whether `query` references a JSON property or not.
     *
     * @param {SqlQuery} query - Choose how to to format the value based on
     *        query.
     * @param {any} value - The value to be formatted.
     * @returns {String} `value` formatted as an SQL-safe string.
     */
	static maybeJsonLiteral (query, value) {
		const literal = query.isProcessingJsonProperty ? JSON.stringify(value) : value

		return pgFormat.literal(literal)
	}

	/**
     * Wrap `this` into an `ExpressionFilter`.
     *
     * @returns {ExpressionFilter} `this` wrapped by an `ExpressionFilter`.
     */
	intoExpression () {
		// The `require` is here to break load-time circular dependencies
		const ExpressionFilter = require('./expression-filter')

		return new ExpressionFilter(this)
	}

	/**
     * Format this filter by pushing string fragments into `_builder`.
     *
     * @param {SqlFragmentBuilder} _builder - Builder for the final SQL string.
     */
	toSqlInto (_builder) {
		throw new Error()
	}
}
