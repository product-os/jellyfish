/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const TypeBooleanHandler = require('../../../../../../apps/server/graphql/card-handlers/type-boolean-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const schema = {
	type: 'boolean'
}

ava('`canHandle` matches boolean JSON schemas', (test) => {
	const handler = new TypeBooleanHandler(schema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new TypeBooleanHandler(schema, 0, fakeContext())
	return handler.process()
}, 'Boolean')

assertTypeIsScalar(function () {
	const handler = new TypeBooleanHandler(schema, 0, fakeContext())
	return handler.process()
})
