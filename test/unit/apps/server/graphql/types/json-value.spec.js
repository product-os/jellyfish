/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType, assertFieldIsOfType, fakeContext
} = require('../graphql-spec-helpers')

const JsonValue = fakeContext().getType('JsonValue')

sharedObjectSpecs(JsonValue, 'JsonValue', [
	'asArray', 'asBoolean', 'asFloat', 'asInteger', 'asJson', 'asObject', 'asString', 'isNull', 'type' ])

assertFieldIsNonNull(JsonValue, 'asJson')
assertFieldIsNonNull(JsonValue, 'isNull')
assertFieldIsNonNull(JsonValue, 'type')
assertFieldIsOfInnerType(JsonValue, 'asJson', 'JSON')
assertFieldIsOfInnerType(JsonValue, 'isNull', 'Boolean')
assertFieldIsOfInnerType(JsonValue, 'type', 'JsonValueType')
assertFieldIsOfType(JsonValue, 'asArray')
assertFieldIsOfType(JsonValue, 'asBoolean')
assertFieldIsOfType(JsonValue, 'asFloat')
assertFieldIsOfType(JsonValue, 'asInteger')
assertFieldIsOfType(JsonValue, 'asObject')
assertFieldIsOfType(JsonValue, 'asString')
