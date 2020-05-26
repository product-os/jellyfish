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
	Email
} = Types

assertTypeIsScalar(Email)
assertTypeNamed(Email, 'Email')

ava('`parseValue` rejects trivially non-email string values', (test) => {
	test.is(null, Email.parseValue('Marty McFly'))
})

ava('`parseValue` accepts email string values', (test) => {
	test.is('marty@mcfly.me', Email.parseValue('marty@mcfly.me'))
})

ava('`serialize` returns a string value unchanged', (test) => {
	test.is('marty@mcfly.me', Email.serialize('marty@mcfly.me'))
})

ava('`serialize` rejects other value types', (test) => {
	test.is(null, Email.serialize({}))
})
