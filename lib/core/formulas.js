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

/**
 * @summary Evaluate a formula expression
 * @function
 * @public
 *
 * @param {String} expression - formula expression
 * @param {Any} context - evaluation context
 * @returns {Any} expression result
 *
 * @example
 * const result = formulas.evaluate('UPPER(input)', 'foo')
 * console.log(result)
 * > 'FOO'
 */
exports.evaluate = (expression, context) => {
	if (_.isNil(context)) {
		return null
	}

	const ast = esprima.parse(expression).body[0].expression
	return staticEval(ast, Object.assign({
		input: context
	}, formula))
}
