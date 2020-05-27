/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const SlugScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/slug-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const slugSchema = {
	type: 'string',
	pattern: '^[a-z0-9-]+$'
}

const altSlugSchema = {
	type: 'string',
	pattern: '^delorean-[a-z0-9-]+$'
}

ava('`canHandle` matches when the last value on the nameStack is `slug`', (test) => {
	const context = fakeContext()
	context.pushName('slug')
	const handler = new SlugScalarHandler({}, 0, context)

	test.true(handler.canHandle())
})

ava('`canHandle` matches string schemas with the common slug pattern', (test) => {
	const handler = new SlugScalarHandler(slugSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches string schemas with a dynamic slug pattern', (test) => {
	const handler = new SlugScalarHandler(altSlugSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new SlugScalarHandler(slugSchema, 0, fakeContext())
	return handler.process()
}, 'Slug')

assertTypeIsScalar(function () {
	const handler = new SlugScalarHandler(slugSchema, 0, fakeContext())
	return handler.process()
})
