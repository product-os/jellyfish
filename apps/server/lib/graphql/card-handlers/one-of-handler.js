/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const AnyOfHandler = require('./any-of-handler')
const skhema = require('skhema')

// Detect `oneOf` shemas and replace them with GraphQL type unions.
//
// This handler is functionally identical to `AnyOfHandler`.

module.exports = class OneOfHandler extends AnyOfHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				oneOf: {
					type: 'array',
					items: {
						type: 'object'
					}
				}
			},
			required: [ 'oneOf' ]
		}, this.chunk)
	}

	children () {
		return this.chunk.oneOf
	}
}
