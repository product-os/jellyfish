/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

const REGEX = /^\d+\.\d+\.\d+$/

module.exports = new graphql.GraphQLScalarType({
	name: 'SemanticVersion',
	description: 'A semantic version consisting of a major, minor and patch version number.  See https://semver.org/ for more information',
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
