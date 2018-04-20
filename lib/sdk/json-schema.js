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
const mergeSchema = require('json-schema-merge-allof')
const errors = require('./errors')
const JSON_SCHEMA_SCHEMA = require('./json-schema.json')

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
	try {
		return mergeSchema({
			type: 'object',
			allOf: schemas
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
 * @returns {(Object|Null)} filtered schema
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
	const ajv = new AJV({
		// https://github.com/epoberezkin/ajv#filtering-data
		removeAdditional: true
	})

	return (schema, object, options = {}) => {
		// Remove all schemas that may have been compiled already
		ajv.removeSchema(/^.*$/)

		if (ajv.compile(disallowAdditionalProperties(schema, {
			force: options.force
		}))(object)) {
			return object
		}

		return null
	}
})()
