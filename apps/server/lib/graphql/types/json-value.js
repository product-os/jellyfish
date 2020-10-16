/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')
const {
	JsonValue
} = require('./json-value-helpers')

const resolveJsonValue = (method) => {
	return (source) => {
		return new JsonValue(source)[method]()
	}
}

module.exports = (context) => {
	return new graphql.GraphQLObjectType({
		name: 'JsonValue',
		description: 'Represents a single JSON value, which can be one of many types.',
		fields () {
			return {
				asArray: {
					description: 'If the value\'s underlying type is an array, return it as a `JsonArray`.',
					type: context.getType('JsonArray'),
					resolve: resolveJsonValue('asArray')
				},
				asBoolean: {
					description: 'If the value\'s underlying type is boolean, return it as a GraphQL boolean.',
					type: graphql.GraphQLBoolean,
					resolve: resolveJsonValue('asBoolean')
				},
				asFloat: {
					description: 'If the value\'s underlying type is a float, return it as a GraphQL float.',
					type: graphql.GraphQLFloat,
					resolve: resolveJsonValue('asFloat')
				},
				asInteger: {
					description: 'If the value\'s underlying type is an integer, return it as a GraphQL integer.',
					type: graphql.GraphQLInt,
					resolve: resolveJsonValue('asInteger')
				},
				asJson: {
					description: 'The value represented as a JSON string.',
					type: graphql.GraphQLNonNull(context.getType('JSON')),
					resolve: resolveJsonValue('asJson')
				},
				asObject: {
					description: 'If the value\'s underlying type is an object, return it as a `JsonObject`.',
					type: context.getType('JsonObject'),
					resolve: resolveJsonValue('asObject')
				},
				asString: {
					description: 'If the value\'s underlying type is a string, return it as a GraphQL string.',
					type: graphql.GraphQLString,
					resolve: resolveJsonValue('asString')
				},
				isNull: {
					description: 'If the value\'s underlying type is null, this property is true',
					type: graphql.GraphQLNonNull(graphql.GraphQLBoolean),
					resolve: resolveJsonValue('isNull')
				},
				type: {
					description: 'Allows you to find out the type of the value programatically.',
					type: graphql.GraphQLNonNull(context.getType('JsonValueType')),
					resolve: resolveJsonValue('valueType')
				}
			}
		}
	})
}
