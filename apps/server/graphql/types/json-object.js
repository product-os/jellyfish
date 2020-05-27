/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

module.exports = (context) => {
	return new graphql.GraphQLObjectType({
		name: 'JsonObject',
		fields () {
			return {
				asJson: {
					description: 'The value represented as a JSON string.',
					type: graphql.GraphQLNonNull(context.getType('JSON'))
				},
				values: {
					description: 'Access this object as a list of `JsonObjectRow` values.',
					type: graphql.GraphQLNonNull(graphql.GraphQLList(graphql.GraphQLNonNull(context.getType('JsonObjectRow'))))
				}
			}
		}
	})
}
