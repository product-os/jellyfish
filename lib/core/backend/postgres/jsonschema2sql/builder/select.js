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

	pushFrom (table, alias) {
		if (alias) {
			this.from.push(`${table} AS ${alias}`)
		} else {
			this.from.push(table)
		}

		return this
	}

	setFilter (filter) {
		this.filter = filter

		return this
	}

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
