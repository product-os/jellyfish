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
const errors = require('./errors')

formula.HASH = (options) => {
	return credentials.hash(options.string, options.salt)
}

formula.PARTIAL = _.partial
formula.FLIP = _.flip
formula.PROPERTY = _.get

formula.AGGREGATE = (list, func) => {
	return Array.from(list.reduce((accumulator, element) => {
		for (const value of func(element)) {
			accumulator.add(value)
		}

		return accumulator
	}, new Set()))
}

exports.evaluate = (expression, options) => {
	if (_.isNil(options.input)) {
		return {
			value: null
		}
	}

	const ast = esprima.parse(expression).body[0].expression
	const result = staticEval(ast, Object.assign({
		this: options.context,
		input: options.input
	}, formula))

	if (_.isError(result)) {
		return {
			value: null
		}
	}

	if (_.isUndefined(result)) {
		throw new errors.JellyfishInvalidExpression(expression)
	}

	return {
		value: result
	}
}
