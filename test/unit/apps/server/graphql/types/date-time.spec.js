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

assertTypeIsScalar(DateTime)
assertTypeNamed(DateTime, 'DateTime')

ava('`parseValue` rejects non-ISO8601 strings', (test) => {
	test.is(null, DateTime.parseValue('Marty McFly'))
})

ava('`parseValue` correctly parses ISO8601 strings', (test) => {
	const expectedDate = new Date(1985, 9, 26, 8, 20, 0)
	test.deepEqual(expectedDate, DateTime.parseValue('1985-10-26T01:20:00-07:00'))
})

ava('`serialize` correctly serialises into ISO8601 strings', (test) => {
	const expectedValue = '1985-10-26T08:20:00.000Z'
	test.is(expectedValue, DateTime.serialize(new Date(1985, 9, 26, 8, 20, 0)))
})
