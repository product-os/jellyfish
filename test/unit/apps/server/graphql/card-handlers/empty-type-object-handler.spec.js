/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const EmptyTypeObjectHandler = require('../../../../../../apps/server/graphql/card-handlers/empty-type-object-handler')
const {
	fakeContext, assertTypeNamed, assertIsObjectType
} = require('../graphql-spec-helpers')

const emptyObjectSchema = {
	type: 'object'
}

const emptyObjectPropertiesSchema = {
	type: 'object',
	properties: {}
}

ava('`canHandle` matches an empty object schema', (test) => {
	const handler = new EmptyTypeObjectHandler(emptyObjectSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches an object schema with empty properties', (test) => {
	const handler = new EmptyTypeObjectHandler(emptyObjectPropertiesSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`process` returns a `JsonValue` type', (test) => {
	const handler = new EmptyTypeObjectHandler(emptyObjectSchema, 0, fakeContext())
	const type = handler.process()
	test.is(type.name, 'JsonValue')
})

assertTypeNamed(function () {
	const handler = new EmptyTypeObjectHandler(emptyObjectSchema, 0, fakeContext())
	return handler.process()
}, 'JsonValue')

assertIsObjectType(function () {
	const handler = new EmptyTypeObjectHandler(emptyObjectSchema, 0, fakeContext())
	return handler.process()
})
