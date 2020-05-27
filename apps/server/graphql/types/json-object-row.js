/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
module.exports = (context) => {
	return new graphql.GraphQLObjectType({
		name: 'JsonObjectRow',
		description: 'Represents a key-value pair in a JSON object',
		fields () {
			return {
				asJson: {
					description: 'The value represented as a JSON string.',
					type: graphql.GraphQLNonNull(context.getType('JSON'))
				},
				key: {
					description: 'The `key` half of the key-value pair.',
					type: graphql.GraphQLNonNull(graphql.GraphQLString)
				},
				value: {
					description: 'The `value` half of the key-value pair.',
					type: graphql.GraphQLNonNull(context.getType('JsonValue'))
				}
			}
		}
	})
}
