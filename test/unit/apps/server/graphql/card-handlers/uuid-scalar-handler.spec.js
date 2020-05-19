/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const UuidScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/uuid-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const schema = {
	type: 'string',
	format: 'uuid'
}

ava('`canHandle` matches UUID formatted string JSON schemas', (test) => {
	const handler = new UuidScalarHandler(schema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new UuidScalarHandler(schema, 0, fakeContext())
	return handler.process()
}, 'ID')

assertTypeIsScalar(function () {
	const handler = new UuidScalarHandler(schema, 0, fakeContext())
	return handler.process()
})
