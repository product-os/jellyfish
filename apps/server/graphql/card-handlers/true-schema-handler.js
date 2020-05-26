/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// A schema of `true` matches any object. We have no recourse but to interpret
// it as a `JsonValue`.
module.exports = class TrueSchemaHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			const: true
		}, this.chunk)
	}

	process (_childResults) {
		return this.context.getType('JsonValue')
	}
}
