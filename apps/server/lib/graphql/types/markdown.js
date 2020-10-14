/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

module.exports = new graphql.GraphQLObjectType({
	name: 'Markdown',
	fields () {
		return {
			raw: {
				type: graphql.GraphQLNonNull(graphql.GraphQLString)
			},
			rendered: {
				type: graphql.GraphQLNonNull(graphql.GraphQLString)
			}
		}
	}
})
