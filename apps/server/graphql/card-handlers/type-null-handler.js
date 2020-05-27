/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Silently drop `null` types.
module.exports = class TypeNullHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'null'
				}
			},
			required: [ 'type' ]
		}, this.chunk)
	}

	process (_childResults) {
		return null
	}
}
