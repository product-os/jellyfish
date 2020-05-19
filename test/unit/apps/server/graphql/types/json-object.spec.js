/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType, fakeContext
} = require('../graphql-spec-helpers')

const JsonObject = fakeContext().getType('JsonObject')

sharedObjectSpecs(JsonObject, 'JsonObject', [ 'asJson', 'values' ])
assertFieldIsNonNull(JsonObject, 'asJson')
assertFieldIsNonNull(JsonObject, 'values')
assertFieldIsOfInnerType(JsonObject, 'asJson', 'JSON')
assertFieldIsOfInnerType(JsonObject, 'values', 'JsonObjectRow')
