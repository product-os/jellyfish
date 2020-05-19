/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const DateTime = require('./date-time')

module.exports = new graphql.GraphQLObjectType({
	name: 'LinkedAt',
	fields: {
		at: {
			type: graphql.GraphQLNonNull(DateTime)
		},
		name: {
			type: graphql.GraphQLNonNull(graphql.GraphQLString)
		}
	}
})
