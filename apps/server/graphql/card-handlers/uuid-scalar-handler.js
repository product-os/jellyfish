/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const skhema = require('skhema')

// Replace strings with UUID format as GraphQL IDs.
module.exports = class UuidScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				format: {
					const: 'uuid'
				}
			},
			required: [ 'type', 'format' ]
		}, this.chunk)
	}

	process (_childResults) {
		return graphql.GraphQLID
	}
}
