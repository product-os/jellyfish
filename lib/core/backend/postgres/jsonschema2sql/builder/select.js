/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * Builder for `SELECT` statements.
 */
module.exports = class SqlSelectBuilder {
	constructor () {
		this.list = []
		this.from = []
		this.filter = null
	}

	/**
	 * Add an entry to the `FROM` clause.
	 *
	 * @param {String} table - The table. This can be the name of a table or
	 *        anything recognized as one, such as subqueries.
	 * @param {String} alias - Table alias. Optional.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushFrom (table, alias) {
		if (alias) {
			this.from.push(`${table} AS ${alias}`)
		} else {
			this.from.push(table)
		}

		return this
	}

	/**
	 * Set the contents of the `WHERE` clause.
	 *
	 * @param {SqlFilter} filter - The filter.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	setFilter (filter) {
		this.filter = filter

		return this
	}

	/**
     * Format this `SELECT` by pushing string fragments into `builder`.
     *
     * @param {SqlFragmentBuilder} builder - Builder for the final SQL string.
     */
	toSqlInto (builder) {
		builder.push('SELECT ')
		if (this.list.length > 0) {
			builder.pushList(this.list)
		} else {
			builder.push('1')
		}
		if (this.from.length > 0) {
			builder.push('\nFROM ')
			builder.pushList(this.from)
		}
		if (this.filter !== null) {
			builder.push('\nWHERE ')
			this.filter.toSqlInto(builder)
		}
	}
}
