/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// More specific handler for schemas that look like Email addresses.
//
// For historical reasons it's possible than an email address field can be
// defined as one of three schemas in our model;
//
// 1. A string with an email format.
// 2. An array of strings with email format.
// 3. An `anyOf` consisting of the two previous options.
//
// This handler only accepts strings with an email format, see also
// `ArrayOfEmailsHandler`.
module.exports = class EmailScalarHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				format: {
					const: 'email'
				}
			},
			required: [ 'type', 'format' ]
		}, this.chunk)
	}

	weight () {
		return 200
	}

	process (_childResults) {
		return this.context.getType('Email')
	}
}
