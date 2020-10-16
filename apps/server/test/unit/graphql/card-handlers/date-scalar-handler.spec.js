/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const DateScalarHandler = require('../../../../lib/graphql/card-handlers/date-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const schema = {
	type: 'string',
	format: 'date-time'
}

ava('`canHandle` matches date-time formatted string JSON schemas', (test) => {
	const handler = new DateScalarHandler(schema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeNamed(() => {
	const handler = new DateScalarHandler(schema, 0, fakeContext())
	return handler.process()
}, 'DateTime')

assertTypeIsScalar(() => {
	const handler = new DateScalarHandler(schema, 0, fakeContext())
	return handler.process()
})
