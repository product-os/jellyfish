/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const formula = require('formulajs')
const staticEval = require('static-eval')
const esprima = require('esprima')
const card = require('./card')

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
	if (!expression) {
		throw new Error('No expression provided')
	}

	if (_.isNil(options.input)) {
		return {
			value: null
		}
	}

	const ast = esprima.parse(expression).body[0].expression

	const result = runAST(ast, {
		context: options.context,
		input: options.input
	})

	if (_.isError(result)) {
		return {
			value: null
		}
	}

	return {
		value: result || null
	}
}

const getDefaultValueForType = (type) => {
	switch (type) {
		case 'array': return []
		default: return null
	}
}

exports.evaluateObject = (schema, object) => {
	for (const path of card.getFormulasPaths(schema)) {
		if (_.isEmpty(object)) {
			continue
		}

		const input = _.get(object, path.output, getDefaultValueForType(path.type))

		const result = exports.evaluate(path.formula, {
			context: object,
			input
		})

		if (!_.isNull(result.value)) {
			// Mutates input object
			_.set(object, path.output, result.value)
		}
	}

	return object
}

const slugify = (string) => {
	return string
		.replace(/[^a-z0-9-]/g, '-')
		.replace(/-{1,}/g, '-')
}

exports.getTypeTriggers = (typeCard) => {
	const triggers = []

	for (const path of card.getFormulasPaths(typeCard.data.schema)) {
		const ast = esprima.parse(path.formula).body[0].expression

		// Aggregating over $events is a special case
		if (ast.type === 'CallExpression' &&
				ast.callee.type === 'Identifier' &&
				ast.callee.name === 'AGGREGATE' &&
				ast.arguments[0].type === 'Identifier' &&
				ast.arguments[0].name === '$events') {
			const arg = runAST(ast.arguments[1], {
				context: {},
				input: {}
			})

			const valueProperty = `source.${arg}`

			triggers.push({
				slug: slugify(`triggered-action-${typeCard.slug}-${path.output.join('-')}`),
				type: 'triggered-action',
				version: '1.0.0',
				active: true,
				links: {},
				requires: [],
				capabilities: [],
				markers: [],
				tags: [],
				data: {
					action: 'action-set-add',
					type: typeCard.slug,
					target: {
						$eval: 'source.links[\'is attached to\'][0].id'
					},
					arguments: {
						property: path.output.join('.'),
						value: {
							$if: valueProperty,
							then: {
								$eval: valueProperty
							},
							else: []
						}
					},
					filter: {
						type: 'object',
						required: [ 'data' ],
						$$links: {
							'is attached to': {
								type: 'object',
								required: [ 'type' ],
								properties: {
									type: {
										type: 'string',
										const: typeCard.slug
									}
								}
							}
						},
						properties: {
							data: {
								type: 'object',
								required: [ 'payload' ],
								properties: {
									payload: {
										type: 'object'
									}
								}
							}
						}
					}
				}
			})
		}
	}

	return triggers
}
