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

exports.compile = (card, options = {}, root, breadcrumb) => {
	return deepMapValues(card, (value, key) => {
		if (_.isString(value)) {
			if (options.blacklist) {
				for (const path of options.blacklist) {
					if (key.join('.').startsWith(path)) {
						return value
					}
				}
			}

			const data = root || card
			return _.template(value, {
				interpolate: /{([\s\S]+?)}/g
			})(Object.assign({}, formula, data))
		}

		if (_.isArray(value)) {
			return _.map(value, (object, index) => {
				return exports.compile(object, options, card, _.concat(key, [ index ]))
			})
		}

		return value
	}, breadcrumb)
}
