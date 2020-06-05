/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')
const textSearch = require('./text-search')

/**
 * Filter asserting that the value of a field is or is not SQL null.
 */
module.exports = class FullTextSearchFilter extends SqlFilter {
	constructor (path, term, asArray = false) {
		super()

		const isRootArray = asArray && path.isProcessingColumn
		this.tsVector = textSearch.toTSVector(path.getTable(), path.slice(1), isRootArray)
		this.tsQuery = textSearch.toTSQuery(term)
	}

	toSqlInto (builder) {
		builder.push(this.tsVector)
		builder.push(' @@ ')
		builder.push(this.tsQuery)
	}
}
