/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

const REGEX = /^.+@.+$/

module.exports = new graphql.GraphQLScalarType({
	name: 'Email',
	description: 'An email address',
	serialize (value) {
		if (typeof value === 'string') {
			return value
		}
		return null
	},
	parseValue (value) {
		if (REGEX.test(value)) {
			return value
		}
		return null
	},
	parseLiteral (ast) {
		if ((ast.kind === graphql.Kind.STRING) && (REGEX.test(ast.value))) {
			return ast.value
		}
		return null
	}
})
