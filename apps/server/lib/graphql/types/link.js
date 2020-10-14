/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

module.exports = (context) => {
	return new graphql.GraphQLObjectType({
		name: 'Link',
		fields () {
			return {
				id: {
					type: graphql.GraphQLNonNull(graphql.GraphQLID)
				},
				name: {
					type: graphql.GraphQLNonNull(graphql.GraphQLString)
				},
				card: {
					type: context.getType('Card')
				}
			}
		}
	})
}
