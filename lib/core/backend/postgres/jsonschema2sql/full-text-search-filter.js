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

		this.path = path.cloned()
		this.term = term
		this.asArray = asArray
	}

	toSqlInto (builder) {
		const isRootArray = this.asArray && this.path.isProcessingColumn
		const tsVector = textSearch.toTSVector(
			builder.getTable(), this.path.asArray(), isRootArray)
		const tsQuery = textSearch.toTSQuery(this.term)
		builder
			.push(tsVector)
			.push(' @@ ')
			.push(tsQuery)
	}
}
