/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const DateScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/date-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const schema = {
	type: 'string',
	format: 'date-time'
}

ava('`canHandle` matches date-time formatted string JSON schemas', (test) => {
	const handler = new DateScalarHandler(schema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new DateScalarHandler(schema, 0, fakeContext())
	return handler.process()
}, 'DateTime')

assertTypeIsScalar(function () {
	const handler = new DateScalarHandler(schema, 0, fakeContext())
	return handler.process()
})
