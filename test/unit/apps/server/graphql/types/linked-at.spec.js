/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Types = require('../../../../../../apps/server/graphql/types')
const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType
} = require('../graphql-spec-helpers')

const {
	LinkedAt
} = Types

sharedObjectSpecs(LinkedAt, 'LinkedAt', [ 'at', 'name' ])
assertFieldIsNonNull(LinkedAt, 'at')
assertFieldIsNonNull(LinkedAt, 'name')
assertFieldIsOfInnerType(LinkedAt, 'at', 'DateTime')
assertFieldIsOfInnerType(LinkedAt, 'name', 'String')
