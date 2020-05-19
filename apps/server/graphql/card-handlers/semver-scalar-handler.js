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
module.exports = class SemverScalarHandler extends BaseHandler {
	canHandle () {
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

	process (_childResults) {
		return this.context.getType('SemanticVersion')
	}
}
