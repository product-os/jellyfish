/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const TypeArrayHandler = require('../../../../../../apps/server/graphql/card-handlers/type-array-handler')
const graphql = require('graphql')
const {
	fakeContext, assertTypeIsList
} = require('../graphql-spec-helpers')

const arraySchema = {
	type: 'array',
	items: {
		type: 'object',
		properties: {
			name: {
				type: 'string'
			}
		}
	}
}

ava('`canHandle` matches array schemas', (test) => {
	const handler = new TypeArrayHandler(arraySchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`children` returns the array item schema', (test) => {
	const handler = new TypeArrayHandler(arraySchema, 0, fakeContext())

	test.deepEqual(handler.children(), [ arraySchema.items ])
})

assertTypeIsList(function () {
	const handler = new TypeArrayHandler(arraySchema, 0, fakeContext())
	return handler.process([ graphql.GraphQLString ])
})
