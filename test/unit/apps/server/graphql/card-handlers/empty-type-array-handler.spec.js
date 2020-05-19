/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const EmptyTypeArrayHandler = require('../../../../../../apps/server/graphql/card-handlers/empty-type-array-handler')
const {
	fakeContext, assertTypeNamed, assertIsObjectType
} = require('../graphql-spec-helpers')

const emptyArraySchema = {
	type: 'array'
}

const emptyArrayItemsSchema = {
	type: 'array',
	items: {}
}

ava('`canHandle` matches an empty array schema', (test) => {
	const handler = new EmptyTypeArrayHandler(emptyArraySchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`canHandle` matches an array schema with empty items', (test) => {
	const handler = new EmptyTypeArrayHandler(emptyArrayItemsSchema, 0, fakeContext())

	test.truthy(handler.canHandle())
})

ava('`process` returns a `JsonValue` type', (test) => {
	const handler = new EmptyTypeArrayHandler(emptyArraySchema, 0, fakeContext())
	const type = handler.process()
	test.is(type.name, 'JsonValue')
})

assertTypeNamed(function () {
	const handler = new EmptyTypeArrayHandler(emptyArraySchema, 0, fakeContext())
	return handler.process()
}, 'JsonValue')

assertIsObjectType(function () {
	const handler = new EmptyTypeArrayHandler(emptyArraySchema, 0, fakeContext())
	return handler.process()
})
