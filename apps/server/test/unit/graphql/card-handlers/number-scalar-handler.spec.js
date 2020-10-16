/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const NumberScalarHandler = require('../../../../lib/graphql/card-handlers/number-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const numberSchema = {
	type: 'number'
}

ava('`canHandle` matches number JSON schemas', (test) => {
	const handler = new NumberScalarHandler(numberSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new NumberScalarHandler(numberSchema, 0, fakeContext())
	return handler.process()
}, 'Float')

assertTypeIsScalar(function () {
	const handler = new NumberScalarHandler(numberSchema, 0, fakeContext())
	return handler.process()
})
