/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const SemanticVersion = require('./semantic-version')
const Slug = require('./slug')

module.exports = new graphql.GraphQLObjectType({
	name: 'CardType',
	fields: {
		name: {
			type: graphql.GraphQLNonNull(Slug),
			resolve: (source) => {
				return source.split('@')[0]
			}
		},
		version: {
			type: graphql.GraphQLNonNull(SemanticVersion),
			resolve: (source) => {
				return source.split('@')[1]
			}
		}
	}
})
