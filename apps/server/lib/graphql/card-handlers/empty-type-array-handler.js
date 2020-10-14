/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Match schemas which define an array but don't define the item type.
//
// Since we're unable to infer the field information about these types we
// rewrite these as `JsonValue` which allows them to be arbitrary data that can
// be serialised as JSON or traversed via a query.
module.exports = class EmptyTypeArrayHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			anyOf: [
				{
					properties: {
						type: {
							const: 'array'
						},
						items: false
					},
					required: [ 'type' ]
				},
				{
					properties: {
						type: {
							const: 'array'
						},
						items: {
							type: 'object',
							maxProperties: 0
						}
					},
					required: [ 'type', 'items' ]
				}
			]
		}, this.chunk)
	}

	weight () { return 20 }

	process (_childResults) {
		return this.context.getType('JsonValue')
	}
}
