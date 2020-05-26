/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const SemverScalarHandler = require('../../../../../../apps/server/graphql/card-handlers/semver-scalar-handler')
const {
	fakeContext, assertTypeNamed, assertTypeIsScalar
} = require('../graphql-spec-helpers')

const semverSchema = {
	type: 'string',
	pattern: '^\\d+\\.\\d+\\.\\d+$'
}

const altSemverSchema = {
	type: 'string',
	pattern: '^\\d+(\\.\\d+)?(\\.\\d+)?$'
}

ava('`canHandle` matches string schemas with the common semver pattern', (test) => {
	const handler = new SemverScalarHandler(semverSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

ava('`canHandle` matches string schemas with the less common semver pattern', (test) => {
	const handler = new SemverScalarHandler(altSemverSchema, 0, fakeContext())

	test.true(handler.canHandle())
})

assertTypeNamed(function () {
	const handler = new SemverScalarHandler(semverSchema, 0, fakeContext())
	return handler.process()
}, 'SemanticVersion')

assertTypeIsScalar(function () {
	const handler = new SemverScalarHandler(semverSchema, 0, fakeContext())
	return handler.process()
})
