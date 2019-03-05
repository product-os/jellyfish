
/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */
/* global process */
/* eslint-disable no-process-env */
const _ = require('lodash')
const Ajv = require('ajv')
const ajvKeywords = require('ajv-keywords')
const metaSchema6 = require('ajv/lib/refs/json-schema-draft-06.json')
const ajv = new Ajv()
ajv.addMetaSchema(metaSchema6)
ajvKeywords(ajv, [
	'formatMaximum',
	'formatMinimum'
])
const ORANGE = '#F54828'
const DEBUG = !_.includes([
	'test'
], process.env.NODE_ENV)

/**
 * @namespace JellyfishSDK.utils
 */
/**
 * @summary Print a debug message to the console
 * @name debug
 * @public
 * @function
 * @memberof JellyfishSDK.utils
 *
 * @description Stream updates and insertions for cards that match a JSON
 * schema
 *
 * @param {*} params - The data to print to the console
 *
 * @example
 * debug('foo bar baz')
 */
exports.debug = (...params) => {
	if (DEBUG) {
		console.log('%cjellyfish:sdk', `color: ${ORANGE};`, ...params)
	}
}

/**
 * @summary Check if a string is a UUID
 * @name isUUID
 * @function
 * @public
 * @memberof JellyfishSDK.utils
 *
 * @param {String} text - string
 * @returns {Boolean} whether the string is a uuid
 *
 * @example
 * if (sdk.utils.isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84')) {
 *   console.log('This is a uuid')
 * }
 */
exports.isUUID = (text) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text)
}

/**
 * @summary Convert a string into a value that can be used as a slug
 * @name slugify
 * @function
 * @public
 * @memberof JellyfishSDK.utils
 *
 * @description Lowercases text, then converts spaces to hyphens and removes any character that isn't
 * alphanumeric or a dash
 *
 * @param {String} text - string
 * @returns {String} A valid slug
 *
 * @example
 * const slug = sdk.utils.slugify('Lorem ipsum!')
 * console.log(slug) //--> 'lorem-ipsum'
 */
exports.slugify = (text) => {
	return text.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^0-9a-z-]/g, '')
}

/**
 * @summary Compile a schema using AJV
 * @name compileSchema
 * @function
 * @public
 * @memberof JellyfishSDK.utils
 *
 * @description Compiles a schema using AJV, return a validator function
 * @see https://github.com/epoberezkin/ajv#compileobject-schema---functionobject-data
 *
 * @param {Object} schema - A JSON schema
 * @returns {Function} An ajv validator function
 *
 * @example
 * const schema = {
 * 	type: 'object',
 * 	properies: {
 * 		type: {
 * 			const: 'thread'
 * 		}
 * 	}
 * };
 *
 * const validator = sdk.utils.compileSchema(schema);
 */
exports.compileSchema = (schema) => {
	return ajv.compile(schema)
}

/**
 * @summary Extracts files from an object
 * @name extractFiles
 * @function
 * @public
 * @memberof JellyfishSDK.utils
 *
 * @description Iterates over all fields of an object looking for file values,
 * when one is found, the value is replaced with `null`. Returns an array of
 * objects, containing a file and the path it was found one
 *
 * @param {Object} subject - The object to iterate over
 * @param {String[]} path - An array of kes representing the path to the field
 * @returns {Object} An object containing the transformed subject and An array
 * of objects containing the file and path
 */
exports.extractFiles = (subject, path = []) => {
	const result = {}
	const elements = []
	_.forEach(subject, (value, key) => {
		if (value && value.constructor.name === 'File') {
			elements.push({
				file: value,
				path: path.concat(key).join('.')
			})
			result[key] = null
			return
		}
		if (_.isPlainObject(value)) {
			const subResult = exports.extractFiles(value, path.concat(key))
			result[key] = subResult.result
			subResult.elements.forEach((element) => {
				elements.push(element)
			})
			return
		}
		result[key] = value
	})
	return {
		result,
		elements
	}
}
