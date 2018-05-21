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

const crypto = require('crypto')
const _ = require('lodash')
const formula = require('formulajs')
const staticEval = require('static-eval')
const esprima = require('esprima')
const card = require('./card')

// Based on https://stackoverflow.com/a/17201493/1641422
const DEFAULT_ITERATIONS = 10000
const DEFAULT_KEY_LENGTH = 64
const DEFAULT_DIGEST = 'sha512'
formula.HASH = (options) => {
	const key = crypto.pbkdf2Sync(
		options.string,
		options.salt,
		DEFAULT_ITERATIONS,
		DEFAULT_KEY_LENGTH,
		DEFAULT_DIGEST)

	return key.toString('hex')
}

formula.PARTIAL = _.partial
formula.FLIP = _.flip
formula.PROPERTY = _.get

formula.REGEX_MATCH = (regex, string) => {
	return string.match(regex)
}

formula.AGGREGATE = (list, func) => {
	return Array.from(list.reduce((accumulator, element) => {
		for (const value of func(element)) {
			accumulator.add(value)
		}

		return accumulator
	}, new Set()))
}

const runAST = (ast, options) => {
	return staticEval(ast, Object.assign({
		this: options.context,
		input: options.input
	}, formula))
}

exports.evaluate = (expression, options) => {
	if (_.isNil(options.input)) {
		return {
			value: null,
			watchers: []
		}
	}

	const ast = esprima.parse(expression).body[0].expression

	// Aggregating over $events is a special case
	if (ast.type === 'CallExpression' &&
			ast.callee.type === 'Identifier' &&
			ast.callee.name === 'AGGREGATE' &&
			ast.arguments[0].type === 'Identifier' &&
			ast.arguments[0].name === '$events') {
		return {
			value: null,
			watchers: [
				{
					type: ast.callee.name,

					// We want to consider events whose target is
					// the current context we're evaluating
					filter: {
						type: 'object',
						required: [ 'data' ],
						properties: {
							data: {
								type: 'object',
								required: [ 'target', 'payload' ],
								properties: {
									payload: {
										type: 'object'
									},
									target: {
										type: 'object',
										required: [ 'type' ],
										properties: {
											type: {
												type: 'string',
												const: options.context.type
											}
										}
									}
								}
							}
						}
					},

					// Because we know we're dealing with events
					target: [ 'data', 'target' ],

					// The evaluated aggregation callback
					arguments: [
						runAST(ast.arguments[1], {
							context: options.context,
							input: options.input
						})
					]
				}
			]
		}
	}

	const result = runAST(ast, {
		context: options.context,
		input: options.input
	})

	if (_.isError(result)) {
		return {
			value: null,
			watchers: []
		}
	}

	if (_.isUndefined(result)) {
		throw new Error(`Invalid expression: ${expression}`)
	}

	return {
		value: result,
		watchers: []
	}
}

exports.evaluateObject = (schema, object) => {
	const watchers = []

	for (const path of card.getFormulasPaths(schema)) {
		if (_.isEmpty(object)) {
			continue
		}

		const input = _.get(object, path.output)

		const result = exports.evaluate(path.formula, {
			context: object,
			input
		})

		if (!_.isEmpty(result.watchers)) {
			if (_.isArray(input)) {
				_.set(object, path.output, _.union(input, result.value))
			}

			for (const watcher of result.watchers) {
				watcher.sourceProperty = path.output
				watchers.push(watcher)
			}
		} else if (!_.isNull(result.value)) {
			// Mutates input object
			_.set(object, path.output, result.value)
		}
	}

	return {
		object,
		watchers
	}
}
