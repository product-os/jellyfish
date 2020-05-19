/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType, fakeContext
} = require('../graphql-spec-helpers')

const JsonArray = fakeContext().getType('JsonArray')

sharedObjectSpecs(JsonArray, 'JsonArray', [ 'asJson', 'values' ])
assertFieldIsNonNull(JsonArray, 'asJson')
assertFieldIsOfInnerType(JsonArray, 'asJson', 'JSON')
assertFieldIsNonNull(JsonArray, 'values')
assertFieldIsOfInnerType(JsonArray, 'values', 'JsonValue')
