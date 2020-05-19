/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */
/* eslint-disable lodash/prefer-constant */
/* eslint-disable no-underscore-dangle */

const _ = require('lodash')
const FIELD_OVERRIDES = require('./field-overrides')
const graphql = require('graphql')
const skhema = require('skhema')
const TypeObjectHandler = require('./type-object-handler')
const {
	pascalCase
} = require('change-case')

// Build a card type.
//
// This is almost exactly the same as `TypeObjectHandler` except that we
// forcibly exclude some fields from generation and replace them with pre-coded
// ones.
module.exports = class CardHandler extends TypeObjectHandler {
	canHandle () {
		return this.depth === 0 && skhema.isValid({
			type: 'object',
			properties: {
				slug: {
					type: 'string', pattern: '^[a-z0-9-]+$'
				},
				version: {
					type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$'
				},
				type: {
					type: 'string', pattern: '^type@'
				},
				active: {
					const: true
				},
				data: {
					type: 'object',
					properties: {
						schema: {
							type: 'object'
						}
					},
					required: [ 'schema' ]
				}
			},
			required: [ 'slug', 'version', 'type', 'active', 'data' ]
		}, this.chunk)
	}

	// `TypeObjectHandler` concievably also matches a card's schema, so we bump
	// the weight here to ensure that this handler is always preffered.
	weight () {
		return 200
	}

	generateTypeName () {
		const version = this.chunk.version.split('.').join('_')
		const name = pascalCase(this.chunk.slug)
		return `${name}V${version}`
	}

	process (childResults) {
		const name = this.generateTypeName()

		const type = new graphql.GraphQLObjectType({
			name,
			interfaces: this.defaultInterfaces(),
			fields: () => {
				let fields = this.buildFields(childResults)

				fields = Object
					.keys(FIELD_OVERRIDES)
					.reduce((result, key) => {
						result[key] = Reflect.apply(FIELD_OVERRIDES[key], this, [])
						return result
					}, fields)

				fields = this.fieldTypesToFields(fields)
				fields = this.markRequiredFieldsAsNonNull(fields)
				fields = this.cameliseKeys(fields)
				return fields
			}
		})

		this.context.registerType(name, type)

		return type
	}

	getProperties () {
		return _.omit(this.mergedSchema().properties || {}, Object.keys(FIELD_OVERRIDES))
	}

	getRequired () {
		return this.mergedSchema().required || []
	}

	defaultInterfaces () {
		return [
			this.context.getType('Node'),
			this.context.getType('Card')
		]
	}

	mergedSchema () {
		if (!this._mergedSchema) {
			this._mergedSchema = skhema.merge([ this.chunk.data.schema, this.context.baseCards.card.data.schema ])
		}

		return this._mergedSchema
	}
}
