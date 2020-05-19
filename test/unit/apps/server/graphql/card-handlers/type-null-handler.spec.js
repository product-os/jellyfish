/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const TypeNullHandler = require('../../../../../../apps/server/graphql/card-handlers/type-null-handler')
const {
	fakeContext
} = require('../graphql-spec-helpers')

const schema = {
	type: 'null'
}

ava('`canHandle` matches null JSON schemas', (test) => {
	const handler = new TypeNullHandler(schema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`process` returns `null`', (test) => {
	const handler = new TypeNullHandler(schema, 0, fakeContext())

	test.is(handler.process(), null)
})
