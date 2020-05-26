/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// Match fields which appear to define a semantic version field and replace them
// with the `Slug` scalar type.
//
// This handler applies in two scenarios:
//   1. The string `"slug"` is at the top of the name stack, or
//   2. The schema has a pattern which looks like a slug pattern.
module.exports = class SlugScalarHandler extends BaseHandler {
	canHandle () {
		return this.fieldNameIsSlug() || this.schemaLooksLikeASlug()
	}

	process (_childResults) {
		return this.context.getType('Slug')
	}

	fieldNameIsSlug () {
		return this.context.peekName() === 'slug'
	}

	schemaLooksLikeASlug () {
		// This is a nasty nasty regex that matches regexes that look like our slug
		// regexes.  Don't @ me.
		const pattern = /^\^[a-z0-9-]*\[a-z0-9-\]\+\$$/

		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'string'
				},
				pattern: {
					type: 'string',
					pattern: pattern.toString().slice(1, -1)
				}
			},
			required: [ 'type', 'pattern' ]
		}, this.chunk)
	}
}
