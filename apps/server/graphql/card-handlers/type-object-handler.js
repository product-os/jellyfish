/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

/* eslint-disable class-methods-use-this */

const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const pluralize = require('pluralize')
const skhema = require('skhema')
const {
	camelCase, pascalCase
} = require('change-case')

// Generate GraphQL Object Types from schemas.
//
// This handler matches JSON Schemas of type `object` with at least one property
// value[1].  It descends into each of the object's `properties` and uses them
// to generate the object's fields.
//
// This is by-far the most complicated handler and it's behaviour is inherited
// by `CardHandler` and `CardInterfaceHandler` so be wary.
//
// [1]: Object Types with no properties are rewritten into a `JsonValue` type.
module.exports = class TypeObjectHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				type: {
					const: 'object'
				},
				properties: {
					type: 'object',
					minProperties: 1
				},
				required: {
					type: 'array',
					items: {
						type: 'string'
					}
				}
			},
			required: [ 'type', 'properties' ]
		}, this.chunk)
	}

	children () {
		return Object.values(this.getProperties())
	}

	nameForChild (childIndex) {
		return Object.keys(this.getProperties())[childIndex]
	}

	process (childResults) {
		const name = this.generateTypeName()

		const existingType = this.context.getType(name)
		if (existingType) {
			return existingType
		}

		const type = new graphql.GraphQLObjectType({
			name,
			fields: () => {
				let fields = this.buildFields(childResults)
				fields = this.fieldTypesToFields(fields)
				fields = this.markRequiredFieldsAsNonNull(fields)
				fields = this.cameliseKeys(fields)
				return fields
			}
		})

		this.context.registerType(name, type)

		return type
	}

	buildFields (childResults) {
		const propertyNames = Object.keys(this.getProperties())

		if (propertyNames.length !== childResults.length) {
			this.logger.warn(
				`while generating type ${this.generateTypeName()}: ` +
				'number of properties doesn\'t equal the number of results'
			)
			return {}
		}

		const result = {}
		for (let idx = 0; idx < propertyNames.length; idx++) {
			const name = propertyNames[idx]
			const value = childResults[idx]
			if (value) {
				result[name] = value
			}
		}
		return result
	}

	cameliseKeys (fields) {
		const result = {}

		for (const key of Object.keys(fields)) {
			const camelisedKey = camelCase(key)

			result[camelisedKey] = fields[key]

			// Add an aliasing resolver if the field has been renamed and it doesn't
			// already have a resolver.
			if ((camelisedKey !== key) && (!result[camelisedKey].resolve)) {
				result[camelisedKey].resolve = (source) => {
					return source[key]
				}
			}
		}

		return result
	}

	getProperties () {
		return this.chunk.properties || {}
	}

	getRequired () {
		return this.chunk.required || []
	}

	generateTypeName () {
		if (this.name) {
			return this.name
		}
		if (this.context.nameStack.length > 0) {
			const nameStack = this.remappedName()
			this.name = nameStack.map(pascalCase).join('')
		} else {
			this.name = this.context.generateAnonymousTypeName('Object')
		}
		return this.name
	}

	remappedName () {
		const nameStack = [ ...this.context.nameStack ]
		const lastName = nameStack.slice(-1)[0]

		// Eg `['CardV1_0_0', 'data']` -> `CardV1_0_0Data`
		if (lastName === 'data') {
			return nameStack
		}

		return [ ...nameStack.slice(0, -1), pluralize(lastName, 1) ]
	}

	markRequiredFieldsAsNonNull (fields) {
		return this
			.getRequired()
			.reduce((result, fieldName) => {
				if (result.hasOwnProperty(fieldName)) {
					if (!graphql.isNonNullType(result[fieldName].type)) {
						result[fieldName].type = graphql.GraphQLNonNull(result[fieldName].type)
					}
				} else {
					this.logger.warn(
						`while generating type ${this.generateTypeName()}: ` +
						`would mark ${fieldName} as non-null, but it is not present in schema`
					)
				}
				return result
			}, fields)
	}

	fieldTypesToFields (fieldTypes) {
		const result = {}

		Object.keys(fieldTypes).forEach((fieldName) => {
			result[fieldName] = {
				type: fieldTypes[fieldName]
			}
		})

		return result
	}
}
