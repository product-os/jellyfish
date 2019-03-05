
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
const _ = require('lodash')
const core = require('../core')
const helpers = require('./helpers')

exports.loadSchema = async (query) => {
	if (_.isString(query)) {
		return core.sdk.card.get(query, {
			type: 'view'
		})
			.then(helpers.getViewSchema)
	}
	if (query.type === 'view') {
		return helpers.getViewSchema(query)
	}
	return query
}
