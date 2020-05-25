/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

// All cards must provide the following, and we don't want to rely on inferring
// type names for them.
//
// Defining them statically allows us to specify resolvers, documentation, etc
// also.
const OVERRIDES = {
	capabilities () {
		return {
			type: this.getType('JsonValue')
		}
	},

	generic_data () {
		return {
			type: this.getType('JsonValue'),
			resolve: (source) => { return source.data }
		}
	},

	id () {
		return {
			type: graphql.GraphQLNonNull(graphql.GraphQLID)
		}
	},

	linked_at () {
		return {
			type: graphql.GraphQLNonNull(new graphql.GraphQLList(this.getType('LinkedAt'))),
			resolve: (source) => {
				if (source.linked_at) {
					return Object
						.entries(source.linked_at)
						.map(([ name, at ]) => {
							return {
								name, at
							}
						})
				}
				return []
			}
		}
	},

	links () {
		return {
			type: graphql.GraphQLNonNull(new graphql.GraphQLList(this.getType('Link'))),
			resolve: (source) => {
				console.dir([ 'links, source was', source ])
				return []
			}
		}
	},

	requires () {
		return {
			type: this.getType('JsonValue')
		}
	},

	slug () {
		return {
			type: graphql.GraphQLNonNull(this.getType('Slug'))
		}
	},

	type () {
		return {
			type: graphql.GraphQLNonNull(this.getType('CardType'))
		}
	},

	version () {
		return {
			type: graphql.GraphQLNonNull(this.getType('SemanticVersion'))
		}
	}
}

// Used by `CardHandler` and `CardInterfaceHandler` to override the generated
// fields.
const applyOverridesToFields = (fields, context) => {
	return Object
		.keys(OVERRIDES)
		.reduce((result, key) => {
			result[key] = Reflect.apply(OVERRIDES[key], context, [])
			return result
		}, fields)
}

module.exports = {
	OVERRIDES, applyOverridesToFields
}
