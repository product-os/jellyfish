/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const {
	constraints
} = require('../../../lib/sdk/link-constraints')

ava('link constraints should all have correct inverse verbs', (test) => {
	for (const constraint of constraints) {
		const inverseConstraint = _.find(constraints, {
			slug: constraint.data.inverse
		})

		test.truthy(inverseConstraint, `Did not find an inverse constraint for ${constraint.slug}`)
		test.is(inverseConstraint.slug, constraint.data.inverse)
		test.is(inverseConstraint.data.from, constraint.data.to,
			`${constraint.slug} has incorrect "to" field or incorrect inverse verb`)
		test.is(inverseConstraint.data.to, constraint.data.from,
			`${constraint.slug} has incorrect "from" field or incorrect inverse verb`)
	}
})
