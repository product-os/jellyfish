/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const BaseHandler = require('./base-handler')
const graphql = require('graphql')
const skhema = require('skhema')
const {
	pascalCase
} = require('change-case')

// Detect `anyOf` schemas and replace them with GraphQL type unions.
//
// 1. Descends into each branch and builds types for them.
// 2. Removes any null results.
// 3. Drops any duplicated types as they are illegal in GraphQL (as well as illogical).
// 4. If there is only one type left in the children, then just return that.
// 5. Otherwise, generate and return a new union.

module.exports = class AnyOfHandler extends BaseHandler {
	canHandle () {
		return skhema.isValid({
			type: 'object',
			properties: {
				anyOf: {
					type: 'array'
				}
			},
			required: [ 'anyOf' ]
		}, this.chunk)
	}

	children () {
		return this.chunk.anyOf
	}

	process (childResults) {
		const resultsWithoutNullOptions = _.uniq(childResults
			.filter((childType) => { return childType !== null }))

		// If there are no options left then we're not a type at all.
		if (resultsWithoutNullOptions.length === 0) {
			return null
		}

		// If there is only one option left once null branches are removed then it's
		// not really any `anyOf` any more, it's just a type.
		if (resultsWithoutNullOptions.length === 1) {
			return resultsWithoutNullOptions[0]
		}

		if (!resultsWithoutNullOptions.every(graphql.isObjectType)) {
			// GraphQL doesn't allow Union's to cover both object and non-object
			// types, so  we have no recourse but to say that the field is just
			// "something JSONish".
			return this.context.getType('JsonValue')
		}

		// Otherwise we need to generate a union of our child types.
		const name = this.generateTypeName()

		this.logger.debug(`Generated new union type named: ${name} containing types`, resultsWithoutNullOptions)

		return new graphql.GraphQLUnionType({
			name,
			types: resultsWithoutNullOptions,
			resolveType (value) {
				// FIXME: this needs to figure out how to resolve the types at runtime.
				return resultsWithoutNullOptions[0]
			}
		})
	}

	generateTypeName () {
		if (this.name) {
			return this.name
		}
		if (this.context.nameStack.length > 0) {
			this.name = this.context.nameStack.map(pascalCase).join('')
		} else {
			this.name = this.context.generateAnonymousTypeName('Union')
		}
		return this.name
	}
}
