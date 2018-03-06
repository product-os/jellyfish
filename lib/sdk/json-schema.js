/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const _ = require('lodash')
const AJV = require('ajv')
const errors = require('./errors')
const JSON_SCHEMA_SCHEMA = require('./json-schema.json')

/**
 * @summary The wildcard schema
 * @type {Object}
 * @public
 */
exports.WILDCARD_SCHEMA = {
  type: 'object'
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
 *   type: 'object'
 * }, {
 *   foo: 'bar'
 * })
 *
 * if (!results.valid) {
 *   for (const error of results.errors) {
 *     console.error(error)
 *   }
 * }
 */
exports.match = (schema, object) => {
  if (!schema) {
    return {
      valid: false,
      errors: [ 'no schema' ]
    }
  }

  const ajv = new AJV({
    allErrors: true
  })

  ajv
    .addSchema(JSON_SCHEMA_SCHEMA, 'schema')
    .addSchema(schema, 'object')

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
 *   type: 'object'
 * }, {
 *   foo: 'bar'
 * })
 *
 * if (!isValid) {
 *   console.log('The object is valid')
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
 *   type: 'object'
 * }, {
 *   foo: 'bar'
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
