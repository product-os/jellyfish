/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const graphql = require('graphql')

// All cards must provide the following, and we don't want to rely on
// inferring type names for them.
module.exports = {
	capabilities () {
		return this.context.getType('JsonValue')
	},

	generic_data () {
		return this.context.getType('JsonValue')
	},

	id () {
		return graphql.GraphQLNonNull(graphql.GraphQLID)
	},

	linked_at () {
		return graphql.GraphQLNonNull(new graphql.GraphQLList(this.context.getType('LinkedAt')))
	},

	links () {
		return graphql.GraphQLNonNull(new graphql.GraphQLList(this.context.getType('Link')))
	},

	requires () {
		return this.context.getType('JsonValue')
	},

	slug () {
		return graphql.GraphQLNonNull(this.context.getType('Slug'))
	},

	type () {
		return graphql.GraphQLNonNull(this.context.getType('CardType'))
	},

	version () {
		return graphql.GraphQLNonNull(this.context.getType('SemanticVersion'))
	}

}
