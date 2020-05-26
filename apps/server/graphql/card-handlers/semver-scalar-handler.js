/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

const KNOWN_PATTERNS = [ '^\\d+\\.\\d+\\.\\d+$', '^\\d+(\\.\\d+)?(\\.\\d+)?$' ]

// Match fields which appear to define a semantic version field and replace them
// with the `SemanticVersion` scalar type.
//
// This handler applies in two scenarios:
//   1. The string `"version"` is at the top of the name stack, or
//   2. The schema has a pattern which matches one of the known patterns above.
module.exports = class SemverScalarHandler extends BaseHandler {
	canHandle () {
		return this.fieldNameIsVersion() || this.schemaLooksLikeAVersion()
	}

	process (_childResults) {
		return this.context.getType('SemanticVersion')
	}

	fieldNameIsVersion () {
		return this.context.peekName() === 'version'
	}

	schemaLooksLikeAVersion () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				pattern: {
					anyOf: KNOWN_PATTERNS.map((pattern) => {
						return {
							const: pattern
						}
					})
				}
			},
			required: [ 'type', 'pattern' ]
		}, this.chunk)
	}
}
