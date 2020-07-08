/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const SelectMap = require('./select-map')
const SqlQuery = require('./sql-query')

module.exports = (table, select, schema, options = {}) => {
	console.log(require('util').inspect(select, false, null, true))
	console.log(require('util').inspect(schema, false, null, true))
	console.log(SqlQuery.fromSchema(null, new SelectMap(select), schema, _.cloneDeep(options))
		.toSqlSelect(table))
	return SqlQuery.fromSchema(null, new SelectMap(select), schema, _.cloneDeep(options))
		.toSqlSelect(table)
}
