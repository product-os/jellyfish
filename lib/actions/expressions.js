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

const _ = require('lodash')
const formula = require('formulajs')
const staticEval = require('static-eval')
const esprima = require('esprima')
const credentials = require('./credentials')

formula.HASH = (options) => {
	return credentials.hash(options.string, options.salt)
}

const eachDeep = (object, callback, breadcrumb = []) => {
	for (const key of Object.keys(object)) {
		const value = object[key]
		const absoluteKey = breadcrumb.concat([ key ])

		if (_.isPlainObject(value)) {
			eachDeep(value, callback, absoluteKey)
			continue
		}

		// eslint-disable-next-line callback-return
		callback(value, absoluteKey)
	}
}

const getRealObjectPath = (schemaPath) => {
	return schemaPath.slice(0, schemaPath.length - 1).filter((fragment) => {
		return fragment !== 'properties'
	})
}

const astCache = new Map()

exports.compileObject = (schema, object) => {
	eachDeep(schema, (value, key) => {
		if (_.last(key) === '$formula') {
			const path = getRealObjectPath(key)
			const args = _.get(object, path)
			if (!args) {
				return
			}

			const ast = astCache.has(value)
				? astCache.get(value)
				: esprima.parse(value).body[0].expression

			astCache.set(value, ast)

			// Mutates input object
			_.set(object, path, staticEval(ast, Object.assign({
				this: args
			}, formula)))
		}
	})

	return object
}
