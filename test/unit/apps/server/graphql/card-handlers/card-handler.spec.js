/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const CardCard = require('../../../../../../lib/core/cards/card')
const CardHandler = require('../../../../../../apps/server/graphql/card-handlers/card-handler')
const graphql = require('graphql')
const {
	camelCase
} = require('change-case')
const {
	fakeContext
} = require('../graphql-spec-helpers')
const {
	OVERRIDES
} = require('../../../../../../apps/server/graphql/card-handlers/field-overrides')

const card = {
	slug: 'time-machine',
	version: '1.0.0',
	type: 'type@1.0.0',
	active: true,
	data: {
		schema: {}
	}
}

const getContext = () => {
	return fakeContext({
		Card: graphql.GraphQLInterfaceType({
			name: 'Card'
		})
	})
}

const childResults = (context) => {
	return [
		// Name
		graphql.GraphQLString,

		// Tags
		graphql.GraphQLList(graphql.GraphQLString),

		// Markers
		graphql.GraphQLList(graphql.GraphQLString),

		// Created_at
		context.getType('DateTime'),

		// Updated_at
		context.getType('DateTime'),

		// Active
		graphql.GraphQLBoolean,

		// Data
		context.getType('JsonValue')
	]
}

ava('`canHandle` matches cards', (test) => {
	const handler = new CardHandler(card, 0, getContext())

	test.true(handler.canHandle())
})

ava('`generateTypeName` generates a sensible name', (test) => {
	const handler = new CardHandler(card, 0, getContext())
	test.is('TimeMachineV1_0_0', handler.generateTypeName())
})

ava('`children` returns the schema of each property minus overriden fields', (test) => {
	const handler = new CardHandler(card, 0, getContext())
	const expectedChildren = Object.values(_.omit(CardCard.data.schema.properties, Object.keys(OVERRIDES)))

	test.deepEqual(handler.children(), expectedChildren)
})

ava('`process` generates a new GraphQL object type', (test) => {
	const handler = new CardHandler(card, 0, getContext())
	const result = handler.process([])
	test.true(graphql.isObjectType(result))
})

ava('`process` correctly generates the correct fields', (test) => {
	const context = fakeContext()
	const handler = new CardHandler(card, 0, context)
	const result = handler.process(childResults(context))

	const fieldNamesInType = Object
		.keys(result.getFields())
		.sort()

	const expectedFieldNames = Object
		.keys(CardCard.data.schema.properties)
		.map(camelCase)
		.concat([ 'genericData' ])
		.sort()

	test.deepEqual(fieldNamesInType, expectedFieldNames)
})

ava('`process` correctly generates the field types', (test) => {
	const context = fakeContext()
	const handler = new CardHandler(card, 0, context)
	const result = handler.process(childResults(context))

	const fieldTypes = Object.values(result.getFields())
		.map((field) => { return graphql.getNamedType(field.type).name })

	const expectedTypes = childResults(context)
		.map((type) => { return graphql.getNamedType(type).name })
		.concat([ 'JsonValue', 'JsonValue', 'ID', 'LinkedAt', 'Link', 'JsonValue', 'Slug', 'CardType', 'SemanticVersion' ])

	test.deepEqual(fieldTypes, expectedTypes)
})

ava('`process` camelises the field names', (test) => {
	const context = fakeContext()
	const handler = new CardHandler(card, 0, context)
	const result = handler.process(childResults(context))

	Object.keys(result.getFields()).forEach((field) => {
		test.is(field, camelCase(field))
	})
})

ava('`process` marks required fields as non nullable', (test) => {
	const context = fakeContext()
	const handler = new CardHandler(card, 0, context)
	const result = handler.process(childResults(context))
	const fields = result.getFields()

	for (const field of CardCard.data.schema.required) {
		test.true(graphql.isNonNullType(fields[camelCase(field)].type), `expected field ${camelCase(field)} to be non-null`)
	}
})
