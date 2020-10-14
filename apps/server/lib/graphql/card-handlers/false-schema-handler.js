/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable lodash/prefer-constant */
/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// A schema of `false` matches nothing.  It gives us no useful information to
// build a type from.
module.exports = class FalseSchemaHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			const: false
		}, this.chunk)
	}

	process (_childResults) {
		return null
	}
}
