/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')
const graphql = require('graphql')

// Convert boolean schemas into the GraphQL Boolean scalar type.
module.exports = class TypeBooleanHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'boolean'
				}
			},
			required: [ 'type' ]
		}, this.chunk)
	}

	process (_childResults) {
		return graphql.GraphQLBoolean
	}
}
