/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Match markdown formatted strings and replace them with the `Markdown` type.
module.exports = class MarkdownScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				format: {
					const: 'markdown'
				}
			},
			required: [ 'type', 'format' ]
		}, this.chunk)
	}

	process (_childResults) {
		return this.context.getType('Markdown')
	}
}
