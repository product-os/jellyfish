/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const TypeObjectHandler = require('../../../../../../apps/server/graphql/card-handlers/type-object-handler')
const graphql = require('graphql')
const {
	assertFieldIsNonNull, assertFieldIsOfInnerType, assertFieldIsOfType, fakeContext, sharedObjectSpecs
} = require('../graphql-spec-helpers')

const schema = {
	type: 'object',
	properties: {
		manufacturer_name: {
			type: 'string'
		},
		model: {
			type: 'string'
		}
	},
	required: [ 'manufacturer_name' ]
}

ava('`canHandle` matches object schemas with at least one property', (test) => {
	const handler = new TypeObjectHandler(schema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`children` returns one child for each property', (test) => {
	const handler = new TypeObjectHandler(schema, 0, fakeContext())

	test.deepEqual(handler.children(), [ {
		type: 'string'
	}, {
		type: 'string'
	} ])
})

sharedObjectSpecs(function () {
	const context = fakeContext()
	for (let idx = 0; idx < 13; idx++) {
		context.generateAnonymousTypeName('Object')
	}

	const handler = new TypeObjectHandler(schema, 0, context)
	return handler.process([ graphql.GraphQLString, graphql.GraphQLString ])
}, 'AnonymousObjectType13', [ 'manufacturerName', 'model' ])

assertFieldIsNonNull(function () {
	const handler = new TypeObjectHandler(schema, 0, fakeContext())
	return handler.process([ graphql.GraphQLString, graphql.GraphQLString ])
}, 'manufacturerName')

assertFieldIsOfInnerType(function () {
	const handler = new TypeObjectHandler(schema, 0, fakeContext())
	return handler.process([ graphql.GraphQLString, graphql.GraphQLString ])
}, 'manufacturerName', 'String')

assertFieldIsOfType(function () {
	const handler = new TypeObjectHandler(schema, 0, fakeContext())
	return handler.process([ graphql.GraphQLString, graphql.GraphQLString ])
}, 'model', 'String')
