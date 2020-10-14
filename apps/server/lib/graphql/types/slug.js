/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

const REGEX = /^[a-z0-9-]+$/

module.exports = new graphql.GraphQLScalarType({
	name: 'Slug',
	description: 'A short identifier consisting only of lowercase letters, numbers and hyphens.',
	serialize: (value) => { return value.toString() },
	parseValue: (value) => {
		if (REGEX.test(value)) {
			return value
		}
		return null
	},
	parseLiteral: (ast) => {
		if ((ast.kind === graphql.Kind.STRING) && (REGEX.test(ast.value))) {
			return ast.value
		}
		return null
	}
})
