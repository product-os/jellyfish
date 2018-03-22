/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
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

const formula = require('formulajs')
const _ = require('lodash')

/**
 * @summary Map object values recursively
 * @function
 * @private
 *
 * @param {Object} object - object
 * @param {Function} callback - callback (value)
 * @param {String[]} [breadcrumb] - location breadcrumb
 * @returns {Object} mapped object
 *
 * @example
 * const result = deepMapValues({
 *	 a: 1,
 *	 b: 2,
 *	 c: 3
 * }, (value) => {
 *	 return value * 2
 * })
 *
 * console.log(result)
 * > {
 * >	 a: 2
 * >	 b: 4
 * >	 c: 6
 * > }
 */
const deepMapValues = (object, callback, breadcrumb = []) => {
	if (!_.isPlainObject(object)) {
		return callback(object, breadcrumb)
	}

	return _.mapValues(object, (value, key) => {
		const absoluteKey = _.concat(breadcrumb, [ key ])

		if (_.isPlainObject(value)) {
			return deepMapValues(value, callback, absoluteKey)
		}

		return callback(value, absoluteKey)
	})
}

const INTERPOLATION_REGEX = /{{([\s\S]+?)}}/g

const interpolate = (string, data) => {
	const results = {}

	try {
		results.value = _.template(string, {
			interpolate: INTERPOLATION_REGEX
		})(Object.assign({}, formula, data))
	} catch (error) {
		if (/^.* is not defined$/.test(error.message)) {
			results.value = string
		} else {
			throw error
		}
	}

	results.complete = !INTERPOLATION_REGEX.test(results.value)
	return results
}

const compile = (card, root, breadcrumb, onInterpolation) => {
	return deepMapValues(card, (value, key) => {
		if (_.isArray(value)) {
			return _.map(value, (object, index) => {
				return exports.compile(object, card, _.concat(key, [ index ]))
			})
		}

		if (!_.isString(value)) {
			return value
		}

		const data = root || card
		const results = interpolate(value, data)
		onInterpolation(results)
		return results.value
	}, breadcrumb)
}

/**
 * @summary Compile card templates
 * @function
 * @public
 *
 * @param {Object} card - card
 * @param {Object} [root] - template root (internally used during recursion)
 * @param {String[]} [breadcrumb] - breadcrumb (internally used during recursion)
 * @param {Number} [previousErrors] - previous errors (internally used during recursion)
 * @returns {Object} compiled card
 *
 * @example
 * const result = computedProperties.compile({
 *   slug: 'user-{{ data.name }}',
 *   type: 'user',
 *   data: {
 *     name: 'johndoe'
 *   }
 * })
 *
 * console.log(result)
 * > {
 * >   slug: 'user-johndoe',
 * >   type: 'user',
 * >   data: {
 * >     name: 'johndoe'
 * >   }
 * > }
 */
exports.compile = (card, root, breadcrumb, previousErrors = Infinity) => {
	let errors = 0

	const result = compile(card, root, breadcrumb, (results) => {
		if (!results.complete) {
			errors += 1
		}
	})

	if (errors === 0) {
		return result
	}

	if (errors >= previousErrors) {
		throw new Error('Could not compile card')
	}

	return exports.compile(result, root, breadcrumb, errors)
}
