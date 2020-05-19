/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

const REGEX = /^.+@.+$/

const serialize = (value) => {
	if (Array.isArray(value)) {
		return serialize(value[0])
	}
	if (typeof value === 'string') {
		return value
	}
	return null
}

module.exports = new graphql.GraphQLScalarType({
	name: 'Email',
	description: 'An email address',
	serialize,
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
