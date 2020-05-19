/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType
} = require('../graphql-spec-helpers')
const {
	CardType
} = require('../../../../../../apps/server/graphql/types')

sharedObjectSpecs(CardType, 'CardType', [ 'name', 'version' ])
assertFieldIsNonNull(CardType, 'name')
assertFieldIsOfInnerType(CardType, 'name', 'Slug')
assertFieldIsNonNull(CardType, 'version')
assertFieldIsOfInnerType(CardType, 'version', 'SemanticVersion')
