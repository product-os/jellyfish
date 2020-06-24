/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const SqlFilter = require('./sql-filter')

/**
 * Filter asserting that there exists a linked card through a link type that
 * passes a filter.
 */
module.exports = class LinkFilter extends SqlFilter {
	/**
	 * Constructor.
	 *
	 * @param {String} linkType - The link type.
	 * @param {SqlFilter} filter - Filter for the link.
	 */
	constructor (linkType, filter) {
		super()

		this.linkType = linkType
		this.filter = filter
	}

	toSqlInto (builder) {
		const joinAlias = builder.getContext().addLink(this.linkType, this.filter)
		builder.push(joinAlias)
		builder.push('.id IS NOT NULL')
	}
}
