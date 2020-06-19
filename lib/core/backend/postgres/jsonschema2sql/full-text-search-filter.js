/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')
const textSearch = require('./text-search')

/**
 * Filter asserting that the value of a field matches a full text search query.
 */
module.exports = class FullTextSearchFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {SqlPath} path - Path to be tested.
	 * @param {String} term - The term to be searched.
	 * @param {Boolean} asArray - Whether this filter should be applied to an
	 *        array of strings, or a plain string (the default). Optional.
	 */
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
