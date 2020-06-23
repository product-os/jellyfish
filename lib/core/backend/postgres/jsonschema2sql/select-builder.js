/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ExpressionFilter = require('./expression-filter')

// Types of joins
const INNER_JOIN = 0

/**
 * Builder for `SELECT` statements.
 */
module.exports = class SqlSelectBuilder {
	constructor () {
		this.list = []
		this.from = []
		this.joins = []
		this.filter = null
		this.groupBy = []
		this.orderBy = []
		this.offset = 0
		this.limit = null
	}

	/**
	 * Add a entry to the `SELECT` list.
	 *
	 * @param {String} item - The item.
	 * @param {String} alias - Item alias. Optional.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushSelect (item, alias) {
		if (alias) {
			this.list.push(`${item} AS ${alias}`)
		} else {
			this.list.push(item)
		}

		return this
	}

	/**
	 * Add an entry to the `FROM` clause.
	 *
	 * @param {String|SqlQuery} table - The table. This can be the name of an
	 *        actual table or anything recognized as one, such as subqueries.
	 * @param {String} alias - Table alias. Optional.
	 * @param {Boolean} isLateral - Whether `table` should be marked as
	 *        `LATERAL`. Optional, defaults to false.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushFrom (table, alias, isLateral = false) {
		this.from.push([ table, alias, isLateral ])

		return this
	}

	/**
	 * Add an `INNER JOIN`.
	 *
	 * @param {String} table - The table to be joined. This can be the name of
	 *        an actual table or anything recognized as one, such as
	 *        subqueries.
	 * @param {SqlFilter} filter - The join condition. Optional, defaults to
	 *        true.
	 * @param {String} alias - Table alias. Optional.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushInnerJoin (table, filter, alias) {
		this.pushJoin(INNER_JOIN, table, filter, alias)

		return this
	}

	pushJoin (type, table, filter, alias) {
		this.joins.push(new SqlJoin(type, table, filter, alias))
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
	 * Add a path to `GROUP BY`.
	 *
	 * @param {SqlPath} path - The path to `GROUP BY`.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushGroupBy (path) {
		this.groupBy.push(path)

		return this
	}

	/**
	 * Add a path to `ORDER BY`.
	 *
	 * @param {SqlPath} path - Path to `ORDER BY`.
	 * @param {Boolean} isDescending - Whether the sort direction is in
	 *        descending order. If false, the sort direction is ascending
	 *        order. Optional, defaults to false (ascending).
	 * @returns {SqlSelectBuilder} `this`.
	 */
	pushOrderBy (path, isDescending = false) {
		this.orderBy.push([ path, isDescending ])

		return this
	}

	/**
	 * Set the `OFFSET`.
	 *
	 * @param {Number} offset - The value for `OFFSET`.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	setOffset (offset) {
		this.offset = offset

		return this
	}

	/**
	 * Set the `LIMIT`.
	 *
	 * @param {Number} limit - The value for `LIMIT`.
	 * @returns {SqlSelectBuilder} `this`.
	 */
	setLimit (limit) {
		this.limit = limit

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
			for (const [ idx, [ table, alias, isLateral ] ] of this.from.entries()) {
				if (idx > 0) {
					builder.push(',\n')
				}
				if (isLateral) {
					builder.push('LATERAL ')
				}
				if (_.isString(table)) {
					builder.push(table)
				} else {
					builder
						.push('(\n')
						.extendFrom(table)
						.push('\n)')
				}
				if (alias) {
					builder
						.push(' AS ')
						.push(alias)
				}
			}
		}
		for (const join of this.joins) {
			builder.extendFrom(join)
		}
		if (this.filter !== null) {
			builder
				.push('\nWHERE ')
				.extendFrom(this.filter)
		}
		if (this.groupBy.length > 0) {
			builder.push('\nGROUP BY ')
			for (const [ idx, path ] of this.groupBy.entries()) {
				if (idx > 0) {
					builder.push(', ')
				}
				builder.push(path.toSql())
			}
		}
		if (this.orderBy.length > 0) {
			builder.push('\nORDER BY ')
			for (const [ idx, [ path, isDescending ] ] of this.orderBy.entries()) {
				if (idx > 0) {
					builder.push(', ')
				}

				builder
					.push(path.toSql())
					.push(isDescending ? ' DESC' : ' ASC')
					.push(' NULLS LAST')
			}
		}
		if (this.offset > 0) {
			builder
				.push('\nOFFSET ')
				.push(this.offset)
		}
		if (this.limit !== null) {
			builder
				.push('\nLIMIT ')
				.push(this.limit)
		}
	}
}

class SqlJoin {
	constructor (type, table, filter, alias) {
		this.type = type
		this.table = table
		this.filter = filter || new ExpressionFilter(true)
		this.alias = alias
	}

	toSqlInto (builder) {
		// TODO: only inner joins are needed atm
		builder.push('\nJOIN ')
		if (_.isString(this.table)) {
			builder.push(this.table)
		} else {
			builder
				.push('(\n')
				.extendFrom(this.table)
				.push('\n)')
		}
		if (this.alias) {
			builder
				.push(' AS ')
				.push(this.alias)
		}
		builder
			.push('\nON ')
			.extendFrom(this.filter)
	}
}
