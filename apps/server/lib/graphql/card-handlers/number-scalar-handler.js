/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')
const graphql = require('graphql')

// Rewrite `number` schemas into the GraphQL Float Type.
module.exports = class NumberScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'number'
				}
			},
			required: [ 'type' ]
		}, this.chunk)
	}

	process (_childResults) {
		return graphql.GraphQLFloat
	}
}
