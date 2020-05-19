/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const TypeArrayOfStringsHandler = require('../../../../../../apps/server/graphql/card-handlers/type-array-of-strings-handler')
const {
	fakeContext
} = require('../graphql-spec-helpers')

const typeArrayOfStringsSchema = {
	type: [ 'string', 'number' ]
}

ava('`canHandle` matches schemas where `type` is an array', (test) => {
	const handler = new TypeArrayOfStringsHandler(typeArrayOfStringsSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`children` returns the type values translated into an `anyOf`', (test) => {
	const handler = new TypeArrayOfStringsHandler(typeArrayOfStringsSchema, 0, fakeContext())

	test.deepEqual(handler.children(), [ {
		anyOf: [
			{
				type: 'string'
			},
			{
				type: 'number'
			}
		]
	} ])
})

ava('`process` returns the child result unchanged', (test) => {
	const handler = new TypeArrayOfStringsHandler(typeArrayOfStringsSchema, 0, fakeContext())

	test.is(handler.process([ 'Marty McFly' ]), 'Marty McFly')
})
