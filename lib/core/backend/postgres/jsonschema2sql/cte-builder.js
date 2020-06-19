/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * Builder for common table expressions.
 */
module.exports = class SqlCteBuilder {
	/**
	 * Constructor.
	 *
	 * @param {SqlSelectBuilder} statement - The statement that makes use of
	 *        the CTE's temporary tables.
	 */
	constructor (statement) {
		this.subqueries = []
		this.statement = statement
	}

	/**
	 * Add a subquery as a temporary table.
	 *
	 * @param {SqlSelectBuilder} select - The subquery.
	 * @param {String} alias - The subquery alias.
	 * @param {Boolean} isMaterialized - Whether the temporary tables are
	 *        explicitly materialized. Optional, defaults to false.
	 * @returns {SqlCteBuilder} `this`.
	 */
	pushSubquery (select, alias, isMaterialized = false) {
		this.subqueries.push([ select, alias, isMaterialized ])

		return this
	}

	/**
	 * Format this common table expressiong by pushing string fragments into
	 * `builder`.
	 *
	 * @param {SqlFragmentBuilder} builder - Builder for the final SQL string.
	 */
	toSqlInto (builder) {
		if (this.subqueries.length > 0) {
			builder.push('WITH ')
			for (const [ idx, [ select, alias, isMaterialized ] ] of this.subqueries.entries()) {
				builder.push(alias)
				builder.push(' AS ')
				if (isMaterialized) {
					builder.push(' MATERIALIZED ')
				}
				builder.push('(\n')
				select.toSqlInto(builder)
				builder.push('\n)')
				if (idx < this.subqueries.length - 1) {
					builder.push(',')
				}
				builder.push('\n')
			}
		}

		this.statement.toSqlInto(builder)
	}
}
