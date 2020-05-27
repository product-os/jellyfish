/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')

// This handler detects schemas where the `type` property is an array of string
// values and rewrites it.
//
// Algorithm:
// 1. Remove any types that are `"null"` as they're redundant given how we're
//    building the graphql types.
// 2. If there's only one type left then rewrite it as a normal schema and
//    return.
// 3. If there is still more than one type left then rewrite it as an `anyOf`
//    and return.
module.exports = class TypeArrayOfStringsHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					type: 'array',
					items: {
						type: 'string'
					}
				}
			},
			required: [ 'type' ]
		}, this.chunk)
	}

	children () {
		const {
			type, ...otherProperties
		} = this.chunk

		const types = type
			.filter((typeName) => { return typeName !== 'null' })

		if (types.length === 1) {
			const newChunk = Object.assign(this.chunk, {
				type: types[0]
			})
			return [ newChunk ]
		}

		const anyOf = types.map((typeName) => {
			return {
				type: typeName, ...otherProperties
			}
		})
		return [ {
			anyOf
		} ]
	}

	process (childResults) {
		return childResults[0]
	}
}
