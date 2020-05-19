/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const AnyOfHandler = require('../../../../../../apps/server/graphql/card-handlers/any-of-handler')
const graphql = require('graphql')
const {
	fakeContext
} = require('../graphql-spec-helpers')

const anyOfSchema = {
	anyOf: [ {
		type: 'object'
	}, {
		type: 'object'
	} ]
}

const typeA = new graphql.GraphQLObjectType({
	name: 'TypeA',
	fields: {
		typeAProperty: {
			type: graphql.GraphQLString
		}
	}
})

const typeB = new graphql.GraphQLObjectType({
	name: 'TypeB',
	fields: {
		typeBProperty: {
			type: graphql.GraphQLString
		}
	}
})

ava('`canHandle` matches `anyOf` JSON schemas', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`children` returns the `anyOf` branches', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())

	test.deepEqual(handler.children(), anyOfSchema.anyOf)
})

ava('`process` returns `null` if there are no viable branches', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())
	const result = handler.process([])

	test.is(null, result)
})

ava('`process` returns the first branch type if there is only one', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())
	const result = handler.process([ typeA ])

	test.deepEqual(typeA, result)
})

ava('`process` returns a GraphQL type union if there is more than one type', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())
	const result = handler.process([ typeA, typeB ])

	test.truthy(graphql.isUnionType(result))
	test.deepEqual(result.getTypes(), [ typeA, typeB ])
})

ava('`process` removes any `null` child results', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())
	const result = handler.process([ typeA, typeB, null ])

	test.truthy(graphql.isUnionType(result))
	test.deepEqual(result.getTypes(), [ typeA, typeB ])
})

ava('`process` reverts to `JsonValue` if one of the child types is scalar', (test) => {
	const handler = new AnyOfHandler(anyOfSchema, 0, fakeContext())
	const result = handler.process([ typeA, typeB, graphql.GraphQLBoolean ])

	test.is(result.name, 'JsonValue')
})
