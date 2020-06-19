/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/**
 * Class that wraps literal SQL fragments and provides `toSql` and `toSqlInto`
 * methods.
 */
module.exports = class LiteralSql {
	/**
	 * Constructor.
	 *
	 * @param {String} sql - The literal SQL fragment to wrap.
	 */
	constructor (sql) {
		this.sql = sql
	}

	toSql () {
		return this.sql
	}

	toSqlInto (builder) {
		builder.push(this.sql)
	}
}
