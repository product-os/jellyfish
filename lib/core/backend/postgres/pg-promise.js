/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const pgp = require('pg-promise')()
const pgTypes = pgp.pg.types
const _ = require('lodash')

const installCustomDateParserIntoPostgresDriver = () => {
	// See node_modules/pg-types/lib/textParsers.js
	const timestampOIDs = [ 1114, 1184 ]

	timestampOIDs.forEach((oid) => {
		const originalParseDate = pgTypes.getTypeParser(oid, 'text')
		const newParseDate = _.wrap(originalParseDate, (fun, value) => {
			return fun(value).toISOString()
		})
		pgTypes.setTypeParser(oid, 'text', newParseDate)
	})
}

installCustomDateParserIntoPostgresDriver()

module.exports = pgp
