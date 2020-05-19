/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Replace date/time formatted strings with the `DateTime` scalar.
module.exports = class DateScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				format: {
					const: 'date-time'
				}
			},
			required: [ 'type', 'format' ]
		}, this.chunk)
	}

	process (_childResults) {
		return this.context.getType('DateTime')
	}
}
