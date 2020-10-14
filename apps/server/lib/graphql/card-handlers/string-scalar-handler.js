/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const skhema = require('skhema')

// Catch-all for other string-based schemas.
//
// Here we deliberately set the weight lower than defualt so that if another
// handler is more confident then it should be used instead.
module.exports = class StringScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				}
			},
			required: [ 'type' ]
		}, this.chunk)
	}

	weight () {
		return 20
	}

	process (_childResults) {
		return graphql.GraphQLString
	}
}
