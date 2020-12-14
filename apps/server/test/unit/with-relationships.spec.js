/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const ava = require('ava')
const sinon = require('sinon')
const withRelationships = require('../../lib/default-cards/mixins/with-relationships')
const linkConstraints = require('@balena/jellyfish-client-sdk/lib/link-constraints')

const expected = require('./test/expected.json')
const card = require('./test/01.json')
const fakeConstraints = require('./test/constraints-subset')

ava('withRelationships adds correct relations to card', async (test) => {
	sinon.stub(linkConstraints, 'constraints').returns(fakeConstraints)
	const relationships = withRelationships(card.slug)
	const cardWithRelationships = _.merge(card, relationships)

	test.deepEqual(cardWithRelationships, expected)
})
