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
	Markdown
} = Types

sharedObjectSpecs(Markdown, 'Markdown', [ 'raw', 'rendered' ])
assertFieldIsNonNull(Markdown, 'raw')
assertFieldIsNonNull(Markdown, 'rendered')
assertFieldIsOfInnerType(Markdown, 'raw', 'String')
assertFieldIsOfInnerType(Markdown, 'rendered', 'String')
