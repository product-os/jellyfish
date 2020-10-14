/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */

const _ = require('lodash')
const graphql = require('graphql')
const skhema = require('skhema')
const TypeObjectHandler = require('./type-object-handler')
const {
	pascalCase
} = require('change-case')
const {
	applyOverridesToFields, OVERRIDES
} = require('./field-overrides')

// Build the `Card` interface which is implemented by all card types.
//
// This is almost exactly the same as `CardHandler`, except that we drop the
// `data` field and generate a GraphQL Interface Type instead of a GraphQL
// Object Type.
module.exports = class CardInterfaceHandler extends TypeObjectHandler {
	canHandle () {
		return this.depth === 0 && skhema.isValid({
			type: 'object',
			properties: {
				slug: {
					const: 'card'
				},
				version: {
					type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$'
				},
				type: {
					type: 'string', pattern: '^type@'
				},
				active: {
					const: true
				}
			},
			required: [ 'slug', 'version', 'type', 'active' ]
		}, this.chunk)
	}

	// Concievably `CardHandler` can also match the base card type, so we increase
	// the weight of this handler to ensure that it's always chosen.
	weight () {
		return 300
	}

	generateTypeName () {
		return 'Card'
	}

	process (childResults) {
		const name = this.generateTypeName()

		const type = new graphql.GraphQLInterfaceType({
			name,
			fields: () => {
				let fields = this.buildFields(childResults)
				fields = this.fieldTypesToFields(fields)
				fields = applyOverridesToFields(fields, this.context)
				fields = this.markRequiredFieldsAsNonNull(fields)
				fields = this.cameliseKeys(fields)
				return fields
			},
			resolveType: (value) => {
				if (value.type) {
					const [ slug, version ] = value.type.split('@')
					const typeName = `${pascalCase(slug)}V${version.replace(/\./g, '_')}`
					return this.context.getType(typeName)
				}
				return null
			}
		})

		this.context.registerType(name, type)

		return type
	}

	// Don't bother trying to build types for fields we're overriding.
	getProperties () {
		const dropFields = [ 'data', ...Object.keys(OVERRIDES) ]
		return _.omit(this.chunk.data.schema.properties || {}, dropFields)
	}

	getRequired () {
		return _.without(this.chunk.data.schema.required || [], 'data')
	}
}
