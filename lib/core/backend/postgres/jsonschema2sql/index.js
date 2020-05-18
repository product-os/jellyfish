/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const generateQuery = require('./original-compiler')
const SqlQuery = require('./sql-query')

module.exports = (table, schema, options = {}) => {
	if (options.useNewCompiler) {
		return SqlQuery.fromSchema(table, schema, options).toSqlSelect()
	}

	return generateQuery(table, schema, options)
}
