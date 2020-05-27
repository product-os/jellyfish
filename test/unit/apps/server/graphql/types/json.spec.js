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
	JSON
} = Types

assertTypeIsScalar(JSON)
assertTypeNamed(JSON, 'JSON')

ava('`parseValue` rejects non-JSON string values', (test) => {
	test.is(null, JSON.parseValue('Marty McFly'))
})

ava('`parseValue` accepts JSON string values', (test) => {
	test.deepEqual({
		town: 'Hill Valley'
	}, JSON.parseValue('{ "town": "Hill Valley" }'))
})

ava('`serialize` returns the value encoded as a JSON string', (test) => {
	test.is('{"town":"Hill Valley"}', JSON.serialize({
		town: 'Hill Valley'
	}))
})
