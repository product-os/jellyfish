/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const pgFormat = require('pg-format')
const SqlFragmentBuilder = require('./fragment-builder')

/**
 * Base class for SQL boolean expressions, aka filters, constraints, or
 * conditions.
 */
module.exports = class SqlFilter {
	/**
	 * Format `value` as either a Postgres JSON literal, or an SQL literal
	 * depending on whether `path` references a JSON property or not.
	 *
	 * @param {SqlPath} path - Choose how to to format the value based on an
	 *        `SqlPath`
	 * @param {any} value - The value to be formatted.
	 * @returns {String} `value` formatted as an SQL-safe string.
	 */
	static maybeJsonLiteral (path, value) {
		const literal = path.isProcessingJsonProperty ? JSON.stringify(value) : value

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

	/**
     * Build an SQL filter expression from `this`.
     *
     * @param {String} table - The table the result will refer to.
     * @returns {String} `this` as an SQL filter expression.
     */
	toSql (table) {
		return new SqlFragmentBuilder(table)
			.extendFrom(this)
			.toSql()
	}
}
