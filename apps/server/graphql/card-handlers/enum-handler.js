/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const BaseHandler = require('./base-handler')
const skhema = require('skhema')
const slugify = require('slugify')
const graphql = require('graphql')
const {
	pascalCase, constantCase
} = require('change-case')

slugify.extend({
	'+': 'plus'
})

const generateOptionName = (value) => {
	let result = slugify(value.toString(), {
		strict: true
	})

	if (/^[0-9]/.test(result)) {
		result = `OPTION_${result}`
	}
	if (/^-[0-9]/.test(result)) {
		result = `OPTION_NEG${result.slice(1)}`
	}

	return constantCase(result)
}

// Handle enum schemas where the value is a scalar.
//
// When we run into a schema which defines an enum of strings or numbers then we
// can trivially generate a GraphQL Enum Type.
module.exports = class EnumHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				enum: {
					type: 'array',
					items: {
						type: [ 'string', 'number' ]
					}
				}
			},
			required: [ 'enum' ]
		}, this.chunk)
	}

	process (_childResults) {
		const name = this.generateTypeName()
		const values = this.chunk.enum.reduce((result, value) => {
			result[generateOptionName(value)] = {
				value
			}
			return result
		}, {})

		return new graphql.GraphQLEnumType({
			name,
			values
		})
	}

	generateTypeName () {
		if (this.name) {
			return this.name
		}
		if (this.context.nameStack.length > 0) {
			this.name = this.context.nameStack.map(pascalCase).join('')
		} else {
			this.name = this.context.generateAnonymousTypeName('Enum')
		}
		return this.name
	}
}
