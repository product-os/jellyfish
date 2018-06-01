/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const AJV = require('ajv')
const debug = require('debug')('jellyfish:json-schema')
const mergeSchema = require('json-schema-merge-allof')
const ajvKeywords = require('ajv-keywords')
const errors = require('./errors')

// Adds extra keywords to an AJV instance using the `ajv-keywords` package.
// This method mutates the AJV instance.
const addKeywordsToAjv = (ajv) => {
	ajvKeywords(ajv, [
		'formatMaximum',
		'formatMinimum'
	])
}

const JSON_SCHEMA_SCHEMA = {
	$schema: 'http://json-schema.org/draft-07/schema#',
	$id: 'jellyfish-meta-schema',
	title: 'Core schema meta-schema',
	definitions: {
		schemaArray: {
			type: 'array',
			minItems: 1,
			items: {
				$ref: '#'
			}
		},
		nonNegativeInteger: {
			type: 'integer',
			minimum: 0
		},
		nonNegativeIntegerDefault0: {
			allOf: [
				{
					$ref: '#/definitions/nonNegativeInteger'
				},
				{
					default: 0
				}
			]
		},
		simpleTypes: {
			enum: [
				'array',
				'boolean',
				'integer',
				'null',
				'number',
				'object',
				'string'
			]
		},
		stringArray: {
			type: 'array',
			items: {
				type: 'string'
			},
			uniqueItems: true,
			default: []
		}
	},
	type: [ 'object', 'boolean' ],
	properties: {
		$id: {
			type: 'string',
			format: 'uri-reference'
		},
		$schema: {
			type: 'string',
			format: 'uri'
		},
		$ref: {
			type: 'string',
			format: 'uri-reference'
		},
		$comment: {
			type: 'string'
		},
		title: {
			type: 'string'
		},
		description: {
			type: 'string'
		},
		default: true,
		readOnly: {
			type: 'boolean',
			default: false
		},
		examples: {
			type: 'array',
			items: true
		},
		multipleOf: {
			type: 'number',
			exclusiveMinimum: 0
		},
		maximum: {
			type: 'number'
		},
		exclusiveMaximum: {
			type: 'number'
		},
		minimum: {
			type: 'number'
		},
		exclusiveMinimum: {
			type: 'number'
		},
		maxLength: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minLength: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		pattern: {
			type: 'string',
			format: 'regex'
		},
		additionalItems: {
			$ref: '#'
		},
		items: {
			anyOf: [
				{
					$ref: '#'
				},
				{
					$ref: '#/definitions/schemaArray'
				}
			],
			default: true
		},
		maxItems: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minItems: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		uniqueItems: {
			type: 'boolean',
			default: false
		},
		contains: {
			$ref: '#'
		},
		maxProperties: {
			$ref: '#/definitions/nonNegativeInteger'
		},
		minProperties: {
			$ref: '#/definitions/nonNegativeIntegerDefault0'
		},
		required: {
			$ref: '#/definitions/stringArray'
		},
		additionalProperties: {
			$ref: '#'
		},
		definitions: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			default: {}
		},
		properties: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			default: {}
		},
		patternProperties: {
			type: 'object',
			additionalProperties: {
				$ref: '#'
			},
			propertyNames: {
				format: 'regex'
			},
			default: {}
		},
		dependencies: {
			type: 'object',
			additionalProperties: {
				anyOf: [
					{
						$ref: '#'
					},
					{
						$ref: '#/definitions/stringArray'
					}
				]
			}
		},
		propertyNames: {
			$ref: '#'
		},
		const: true,
		enum: {
			type: 'array',
			items: true,
			minItems: 1,
			uniqueItems: true
		},
		type: {
			anyOf: [
				{
					$ref: '#/definitions/simpleTypes'
				},
				{
					type: 'array',
					items: {
						$ref: '#/definitions/simpleTypes'
					},
					minItems: 1,
					uniqueItems: true
				}
			]
		},
		format: {
			type: 'string'
		},
		contentMediaType: {
			type: 'string'
		},
		contentEncoding: {
			type: 'string'
		},
		if: {
			$ref: '#'
		},
		then: {
			$ref: '#'
		},
		else: {
			$ref: '#'
		},
		allOf: {
			$ref: '#/definitions/schemaArray'
		},
		anyOf: {
			$ref: '#/definitions/schemaArray'
		},
		oneOf: {
			$ref: '#/definitions/schemaArray'
		},
		not: {
			$ref: '#'
		}
	},
	default: true
}

/**
 * @summary Match an object against a schema
 * @function
 * @public
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @returns {Object} results
 *
 * @example
 * const results = jsonSchema.match({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 *
 * if (!results.valid) {
 *	 for (const error of results.errors) {
 *		 console.error(error)
 *	 }
 * }
 */
exports.match = (() => {
	const ajv = new AJV({
		allErrors: true
	})

	addKeywordsToAjv(ajv)

	ajv
		.addSchema(JSON_SCHEMA_SCHEMA, 'schema')

	return (schema, object) => {
		if (!schema) {
			return {
				valid: false,
				errors: [ 'no schema' ]
			}
		}

		// Remove the object schema in case it has been added already
		ajv.removeSchema('object')

		ajv.addSchema(schema, 'object')

		if (!ajv.validate('schema', schema) || !schema.type) {
			return {
				valid: false,
				errors: [ 'invalid schema' ]
			}
		}

		const valid = ajv.validate('object', object)

		return {
			valid,
			errors: valid ? [] : ajv.errorsText().split(', ')
		}
	}
})()

/**
 * @summary Check if an object matches a schema
 * @function
 * @public
 *
 * @description
 * This is a shorthand function for `.match()` which can be used
 * if the caller is not interested in the actual error messages.
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 * @returns {Boolean} whether the object matches the schema
 *
 * @example
 * const isValid = jsonSchema.isValid({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 *
 * if (isValid) {
 *	 console.log('The object is valid')
 * }
 */
exports.isValid = (schema, object) => {
	return exports.match(schema, object).valid
}

/**
 * @summary Validate an object and throw if invalid
 * @function
 * @public
 *
 * @param {Object} schema - JSON schema
 * @param {Object} object - object
 *
 * @example
 * jsonSchema.validate({
 *	 type: 'object'
 * }, {
 *	 foo: 'bar'
 * })
 */
exports.validate = (schema, object) => {
	const result = exports.match(schema, object)
	if (!result.valid) {
		throw new errors.JellyfishSchemaMismatch(_.join([
			'Invalid object:',
			JSON.stringify(object, null, 2),
			_.join(_.map(result.errors, (error) => {
				return `- ${error}`
			}), '\n')
		], '\n\n'))
	}
}

/**
 * @summary Merge two or more JSON Schemas
 * @function
 * @public
 *
 * @param {Object[]} schemas - a set of JSON Schemas
 * @returns {Object} merged JSON Schema
 *
 * @example
 * const result = jsonSchema.merge([
 *	 {
 *		 type: 'string',
 *		 maxLength: 5,
 *		 minLength: 2
 *	 },
 *	 {
 *		 type: 'string',
 *		 maxLength: 3
 *	 }
 * ])
 *
 * console.log(result)
 * > {
 * >	 type: 'string',
 * >	 maxLength: 3,
 * >	 minLength: 2
 * > }
 */
exports.merge = (schemas) => {
	if (schemas.length === 1 && schemas[0].type) {
		return schemas[0]
	}

	try {
		return mergeSchema({
			type: 'object',
			allOf: schemas.map((schema) => {
				// If the schema has a single 'anyOf' item, we can treat that as
				// a direct key/value mapping. This can happen when dealing with views
				// created by rendition
				if (!schema.anyOf || schema.anyOf.length !== 1) {
					return schema
				}

				return _.omit(_.merge({}, schema, schema.anyOf[0]), 'anyOf')
			})
		})
	} catch (error) {
		// A terrible way to identify incompatible schemas
		if (_.startsWith(error.message, 'Could not resolve values for path')) {
			throw new errors.JellyfishIncompatibleSchemas('The schemas can\'t be merged')
		}

		throw error
	}
}

/**
 * @summary Disallow additional properties of a schema
 * @function
 * @private
 *
 * @param {Object} schema - schema
 * @param {Object} options - options
 * @param {Boolean} options.force=false - force no additional properties
 * @returns {Object} mutated schema
 *
 * @example
 * const schema = disallowAdditionalProperties({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'string'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *   force: true
 * })
 *
 * console.log(schema.additionalProperties)
 * > false
 */
const disallowAdditionalProperties = (schema, options) => {
	if (schema.type !== 'object') {
		return schema
	}

	// Don't even consider the original value of `additionalProperties` if so
	if (options.force) {
		schema.additionalProperties = false
	} else {
		schema.additionalProperties = schema.additionalProperties || false
	}

	schema.properties = _.mapValues(schema.properties, disallowAdditionalProperties)
	return schema
}

/**
 * @summary Filter an object based on a schema
 * @function
 * @public
 *
 * @param {Object} schema - schema
 * @param {Object} object - object
 * @param {Object} [options] - options
 * @param {Boolean} [options.force=false] - force filter
 * @returns {(Object|Null)} filtered object
 *
 * @example
 * const result = jsonSchema.filter({
 *	 type: 'object',
 *	 properties: {
 *		 foo: {
 *			 type: 'number'
 *		 }
 *	 },
 *	 required: [ 'foo' ]
 * }, {
 *	 foo: 1,
 *	 bar: 2
 * })
 *
 * console.log(result)
 * > {
 * >	 foo: 1
 * > }
 */
exports.filter = (() => {
	// Create an instance of AJV that will be used to strip fields from objects
	const filterAjv = new AJV({
		// https://github.com/epoberezkin/ajv#filtering-data
		removeAdditional: true
	})

	// Create an instance of AJV that will be used to perform simple matchin
	const matchAjv = new AJV({
		allErrors: true
	})

	addKeywordsToAjv(filterAjv)
	addKeywordsToAjv(matchAjv)

	return (schema, object, options = {}) => {
		// Remove all schemas that may have been compiled already
		filterAjv.removeSchema(/^.*$/)
		matchAjv.removeSchema(/^.*$/)

		// Parse the schema to create a schema that will be used for filtering
		// properties
		const filterSchema = disallowAdditionalProperties(_.cloneDeep(schema), {
			force: options.force
		})

		const filterValidator = filterAjv.compile(filterSchema)
		const matchValidator = matchAjv.compile(schema)

		// A flag to help inform the return type
		const calledWithArray = _.isArray(object)

		// Run all the logic as if this function was called with an array, to help
		// homogenise filter logic
		const items = _.castArray(object)

		// If the schema uses 'anyOf', each subschema is checked independently. to
		// improve performance when dealing with large collections of elements,
		// validators are created and cached before iterating over the collection
		let fragmentValidators = []
		if (schema.anyOf) {
			const baseSchema = _.omit(schema, 'anyOf')
			fragmentValidators = _.map(schema.anyOf, (fragment) => {
				// Merge fragment schema with scehma values defined at the top level
				// - Defaults schema `type` to 'object'
				// - Removes any $id attribute, as we may be compiling the same $id
				//   multiple times
				const mergedFragment = _.omit(_.mergeWith(
					{
						type: 'object'
					},
					fragment,
					baseSchema,
					/* eslint-disable consistent-return */
					(objectValue, sourceValue) => {
						if (_.isArray(objectValue)) {
							return _.union(objectValue, sourceValue)
						}
					}
				), [ '$id' ])

				// Create the matcher before running disallowAdditionalProperties, as it
				// mutates the object, and we want to avoid performing an expensive clone
				const match = matchAjv.compile(mergedFragment)
				const fragmentFilterSchema = disallowAdditionalProperties(mergedFragment, {
					force: options.force
				})
				const filter = filterAjv.compile(fragmentFilterSchema)
				return {
					match,
					filter
				}
			})
		}

		if (items.length > 500) {
			debug(`Large query detected, ${items.length} items received`)
			debug(JSON.stringify(schema))
		}

		// Reduce is used here due to the behaviour of the AJV `removeAdditional`
		// option, which mutates the object
		const result = items.reduce((carry, item) => {
			// First check to see if the item validates against any fragement
			// validators
			if (fragmentValidators.length && matchValidator(item)) {
				for (const fragmentValidator of fragmentValidators) {
					if (fragmentValidator.match(item)) {
						if (fragmentValidator.filter(item)) {
							carry.push(item)
						}

						return carry
					}
				}
			}

			// If no fragment validators matched, run the item against the validator
			// created using the complete schema
			if (filterValidator(item)) {
				carry.push(item)
			}

			return carry
		}, [])

		// If the function was called with an array, return an array, otherwise
		// return the first array element, or null if its undefined
		if (calledWithArray) {
			return result
		}

		return _.first(result) || null
	}
})()
