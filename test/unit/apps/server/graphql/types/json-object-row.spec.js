/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const graphql = require('graphql')
const {
	sharedObjectSpecs, fakeContext
} = require('../graphql-spec-helpers')

const JsonObjectRow = fakeContext().getType('JsonObjectRow')

sharedObjectSpecs(JsonObjectRow, 'JsonObjectRow', [ 'asJson', 'key', 'value' ])

ava('the `asJson` field is non-null', (test) => {
	test.true(graphql.isNonNullType(JsonObjectRow.getFields().asJson.type))
})

ava('the `asJson` field inner type is `JSON`', (test) => {
	test.is(graphql.getNullableType(JsonObjectRow.getFields().asJson.type).name, 'JSON')
})

ava('the `key` field is non null', (test) => {
	test.true(graphql.isNonNullType(JsonObjectRow.getFields().key.type))
})

ava('the `key` field inner type is `String`', (test) => {
	test.is(graphql.getNullableType(JsonObjectRow.getFields().key.type).name, 'String')
})

ava('the `value` field is non null', (test) => {
	test.true(graphql.isNonNullType(JsonObjectRow.getFields().value.type))
})

ava('the `value` field inner type is `JsonValue`', (test) => {
	test.is(graphql.getNullableType(JsonObjectRow.getFields().value.type).name, 'JsonValue')
})
