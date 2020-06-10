/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Types = require('../../../../../../apps/server/graphql/types')
const {
	assertTypeIsScalar, assertTypeNamed
} = require('../graphql-spec-helpers')

const {
	DateTime
} = Types

const generateKnownUTCTime = () => {
	const date = new Date()
	date.setUTCFullYear(1985)
	date.setUTCMonth(9)
	date.setUTCDate(26)
	date.setUTCHours(8)
	date.setUTCMinutes(20)
	date.setUTCSeconds(0)
	date.setUTCMilliseconds(0)
	return date
}

assertTypeIsScalar(DateTime)
assertTypeNamed(DateTime, 'DateTime')

ava('`parseValue` rejects non-ISO8601 strings', (test) => {
	test.is(null, DateTime.parseValue('Marty McFly'))
})

ava('`parseValue` correctly parses ISO8601 strings', (test) => {
	const expectedDate = generateKnownUTCTime()
	test.deepEqual(expectedDate, DateTime.parseValue('1985-10-26T01:20:00-07:00'))
})

ava('`serialize` correctly serialises into ISO8601 strings', (test) => {
	const expectedValue = '1985-10-26T08:20:00.000Z'
	test.is(expectedValue, DateTime.serialize(generateKnownUTCTime()))
})
