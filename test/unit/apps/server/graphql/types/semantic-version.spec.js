/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Types = require('../../../../../../apps/server/graphql/types')
const {
	assertTypeIsScalar, assertTypeNamed
} = require('../graphql-spec-helpers')

const {
	SemanticVersion
} = Types

assertTypeIsScalar(SemanticVersion)
assertTypeNamed(SemanticVersion, 'SemanticVersion')

ava('`parseValue` rejects non semantic version string values', (test) => {
	test.is(null, SemanticVersion.parseValue('Marty McFly'))
})

ava('`parseValue` accepts semantic version string values', (test) => {
	test.is('1.2.3', SemanticVersion.parseValue('1.2.3'))
})

ava('`serialize` returns a string value unchanged', (test) => {
	test.is('1.2.3', SemanticVersion.serialize('1.2.3'))
})
