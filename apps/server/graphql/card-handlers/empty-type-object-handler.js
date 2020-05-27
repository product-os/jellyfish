/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Match schemas which define an object but don't define any properties.
//
// Since we're unable to infer the field information about these types, and
// GraphQL requires us to define at least one field on an object type we rewrite
// these as `JsonValue` which allows them to be arbitrary data that can be
// serialised as JSON or traversed via a query.
module.exports = class EmptyTypeObjectHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			anyOf: [
				{
					required: [ 'type' ],
					properties: {
						type: {
							const: 'object'
						}
					}
				},
				{
					properties: {
						type: false
					}
				}
			],
			properties: {
				properties: {
					type: 'object',
					maxProperties: 0
				}
			}
		}, this.chunk)
	}

	weight () {
		return 20
	}

	process (_childResults) {
		return this.context.getType('JsonValue')
	}
}
