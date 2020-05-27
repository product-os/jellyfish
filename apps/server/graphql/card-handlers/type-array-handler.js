/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const skhema = require('skhema')

// Convert array schemas into GraphQL List types.
module.exports = class TypeArrayHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'array'
				},
				items: {
					type: 'object',
					minProperties: 1
				}
			},
			required: [ 'type', 'items' ]
		}, this.chunk)
	}

	children () {
		return [ this.chunk.items ]
	}

	process (childResults) {
		const filteredResult = childResults
			.filter((item) => { return Boolean(item) })
			.map((type) => { return graphql.GraphQLNonNull(type) })

		if (filteredResult.length === 0) {
			return null
		}

		return new graphql.GraphQLList(filteredResult[0])
	}
}
