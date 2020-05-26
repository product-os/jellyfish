/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const OneOfHandler = require('../../../../../../apps/server/graphql/card-handlers/one-of-handler')
const AnyOfHandler = require('../../../../../../apps/server/graphql/card-handlers/any-of-handler')
const {
	fakeContext
} = require('../graphql-spec-helpers')

const oneOfSchema = {
	oneOf: [
		{
			type: 'string'
		},
		{
			type: 'number'
		}
	]
}

ava('`canHandle` matches `oneOf` JSON schemas', (test) => {
	const handler = new OneOfHandler(oneOfSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`children` returns the `oneOf` branches', (test) => {
	const handler = new OneOfHandler(oneOfSchema, 0, fakeContext())

	test.deepEqual(handler.children(), oneOfSchema.oneOf)
})

ava('descends from `anyOfHandler`', (test) => {
	const handler = new OneOfHandler(oneOfSchema, 0, fakeContext())

	test.true(handler instanceof AnyOfHandler)
})
