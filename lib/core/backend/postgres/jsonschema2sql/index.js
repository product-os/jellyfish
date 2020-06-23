/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlQuery = require('./sql-query')

module.exports = (table, schema, options = {}) => {
	return SqlQuery.fromSchema(table, schema, options).toSqlSelect()
}
