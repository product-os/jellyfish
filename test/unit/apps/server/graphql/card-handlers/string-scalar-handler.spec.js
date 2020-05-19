/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const StringScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/string-scalar-handler')
const BaseHandler = require('../../../../../../apps/server/graphql/card-handlers/base-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const stringSchema = {
	type: 'string'
}

ava('`canHandle` matches string schemas', (test) => {
	const handler = new StringScalarHandler(stringSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`weight` is less than the default handler weight', (test) => {
	const handler = new StringScalarHandler(stringSchema, 0, fakeContext())
	test.truthy(handler.weight() < BaseHandler.prototype.weight())
})

assertTypeNamed(function () {
	const handler = new StringScalarHandler(stringSchema, 0, fakeContext())
	return handler.process()
}, 'String')

assertTypeIsScalar(function () {
	const handler = new StringScalarHandler(stringSchema, 0, fakeContext())
	return handler.process()
})
