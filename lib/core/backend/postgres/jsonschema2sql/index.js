/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const SqlQuery = require('./sql-query')

module.exports = (table, select, schema, options = {}) => {
	return SqlQuery.fromSchema(null, _.cloneDeep(select), schema, options)
		.toSqlSelect(table)
}
