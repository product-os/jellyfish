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
	Slug
} = Types

assertTypeIsScalar(Slug)
assertTypeNamed(Slug, 'Slug')

ava('`parseValue` rejects non slug string values', (test) => {
	test.is(null, Slug.parseValue('Delorean DMC-12'))
})

ava('`parseValue` accepts slug string values', (test) => {
	test.is('delorean-dmc-12', Slug.parseValue('delorean-dmc-12'))
})

ava('`serialize` returns a string value unchanged', (test) => {
	test.is('delorean-dmc-12', Slug.serialize('delorean-dmc-12'))
})
