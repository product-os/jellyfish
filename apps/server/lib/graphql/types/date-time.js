/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const isValid = require('date-fns/isValid')
const parseISO = require('date-fns/parseISO')

const parseIso8601String = (value) => {
	const parsedValue = parseISO(value)
	return isValid(parsedValue) ? parsedValue : null
}

module.exports = new graphql.GraphQLScalarType({
	name: 'DateTime',
	description: 'A _simplified_ ISO8601 date time as per Javascript\'s `Date.prototype.toISOString()`.',
	serialize: (value) => {
		if (value instanceof Date) {
			return value.toISOString()
		}
		if (typeof (value) === 'string') {
			const parsedValue = parseIso8601String(value)
			if (parsedValue) {
				return parsedValue.toISOString()
			}
		}
		return null
	},
	parseValue: parseIso8601String,
	parseLiteral: (ast) => {
		if (ast.kind === graphql.Kind.STRING) {
			return parseIso8601String(ast.value)
		}
		return null
	}
})
