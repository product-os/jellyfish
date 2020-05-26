/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const CardHandler = require('../../../../../../apps/server/graphql/card-handlers/card-handler')
const CardInterfaceHandler = require('../../../../../../apps/server/graphql/card-handlers/card-interface-handler')
const CardCard = require('../../../../../../lib/core/cards/card')
const Types = require('../../../../../../apps/server/graphql/types')
const fieldOverrides = require('../../../../../../apps/server/graphql/card-handlers/field-overrides')
const graphql = require('graphql')
const {
	fakeContext
} = require('../graphql-spec-helpers')
const _ = require('lodash')
const {
	camelCase
} = require('change-case')

// Reasonable replacements for the results of processing a card's children.
const childResults = [
	// Name
	graphql.GraphQLString,

	// Tags
	graphql.GraphQLList(graphql.GraphQLString),

	// Markers
	graphql.GraphQLList(graphql.GraphQLString),

	// Created_at
	Types.DateTime,

	// Updated_at
	Types.DateTime,

	// Active
	graphql.GraphQLBoolean
]

ava('`canHandle` matches the card card', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`weight` is higher than the card handler\'s', (test) => {
	const cardInterfaceHandler = new CardInterfaceHandler(CardCard, 0, {})
	const cardHandler = new CardHandler(CardCard, 0, {})
	test.true(cardInterfaceHandler.weight() > cardHandler.weight())
})

ava('`generateTypeName` is `Card`', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, {})
	test.is(handler.generateTypeName(), 'Card')
})

ava('`children` returns the schema of each property minus overriden fields and `data`', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const expectedChildren = Object.values(_.omit(
		CardCard.data.schema.properties,
		Object.keys(fieldOverrides).concat([ 'data' ])
	))

	test.deepEqual(handler.children(), expectedChildren)
})

ava('`process` generates a new GraphQL interface type named `Card`', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const result = handler.process([])
	test.true(graphql.isInterfaceType(result))
	test.is(result.name, 'Card')
})

ava('`process` correctly generates the correct fields', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const result = handler.process(childResults)

	const fieldNamesInType = Object
		.keys(result.getFields())
		.sort()

	const expectedFieldNames = Object
		.keys(CardCard.data.schema.properties)
		.map(camelCase)
		.map((name) => {
			if (name === 'data') {
				return 'genericData'
			}
			return name
		})
		.sort()

	test.deepEqual(fieldNamesInType, expectedFieldNames)
})

ava('`process` correctly generates the field types', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const result = handler.process(childResults)

	const fieldTypes = Object.values(result.getFields())
		.map((field) => { return graphql.getNamedType(field.type).name })

	const expectedTypes = childResults
		.map((type) => { return graphql.getNamedType(type).name })
		.concat([ 'JsonValue', 'JsonValue', 'ID', 'LinkedAt', 'Link', 'JsonValue', 'Slug', 'CardType', 'SemanticVersion' ])

	test.deepEqual(fieldTypes, expectedTypes)
})

ava('`process` camelises the field names', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const result = handler.process(childResults)

	Object.keys(result.getFields()).forEach((field) => {
		test.is(field, camelCase(field))
	})
})

ava('`process` marks required fields as non nullable', (test) => {
	const handler = new CardInterfaceHandler(CardCard, 0, fakeContext())
	const result = handler.process(childResults)
	const fields = result.getFields()

	for (const field of _.without(CardCard.data.schema.required, 'data')) {
		test.true(graphql.isNonNullType(fields[camelCase(field)].type), `expected field ${camelCase(field)} to be non-null`)
	}
})
