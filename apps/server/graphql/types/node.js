/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

module.exports = new graphql.GraphQLInterfaceType({
	name: 'Node',
	fields: {
		id: {
			type: graphql.GraphQLNonNull(graphql.GraphQLID)
		}
	}
})
