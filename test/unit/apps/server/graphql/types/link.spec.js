/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const {
	sharedObjectSpecs, assertFieldIsNonNull, assertFieldIsOfInnerType, assertFieldIsOfType, fakeContext
} = require('../graphql-spec-helpers')

const context = fakeContext()
context.registerType('Card', new graphql.GraphQLInterfaceType({
	name: 'Card',
	fields: {
		id: graphql.GraphQLNonNull(graphql.GraphQLID)
	}
}))
const Link = context.getType('Link')

sharedObjectSpecs(Link, 'Link', [ 'id', 'name', 'card' ])
assertFieldIsNonNull(Link, 'id')
assertFieldIsNonNull(Link, 'name')
assertFieldIsOfInnerType(Link, 'id', 'ID')
assertFieldIsOfInnerType(Link, 'name', 'String')
assertFieldIsOfType(Link, 'card', 'Card')
