/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

module.exports = new graphql.GraphQLEnumType({
	name: 'JsonValueType',
	description: 'Helpfully identifies the type of data stored in a `JsonValue`.',
	values: {
		INTEGER: {
			value: 'integer'
		},
		FLOAT: {
			value: 'float'
		},
		STRING: {
			value: 'string'
		},
		OBJECT: {
			value: 'object'
		},
		LIST: {
			value: 'list'
		},
		BOOLEAN: {
			value: 'boolean'
		},
		NULL: {
			value: 'null'
		}
	}
})
