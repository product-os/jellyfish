/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

const parseValue = (value) => {
	try {
		return JSON.parse(value)
	} catch (_) {
		return null
	}
}

module.exports = new graphql.GraphQLScalarType({
	name: 'JSON',
	description: 'A JSON encoded string value',
	serialize: (value) => { return JSON.stringify(value) },
	parseValue,
	parseLiteral: (ast) => {
		if (ast.kind === graphql.Kind.STRING) {
			return parseValue(ast.value)
		}
		return null
	}
})
