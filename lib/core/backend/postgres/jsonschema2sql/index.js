/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const REGEXES = require('./regexes')

/*
 * See https://www.postgresql.org/docs/9.6/functions-json.html for reference.
 */

const CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES = {
	id: 'string',
	version: 'string',
	slug: 'string',
	type: 'string',
	tags: 'array',
	markers: 'array',
	links: 'object',
	created_at: 'string',
	active: 'boolean',
	requires: 'array',
	capabilities: 'array',
	data: 'object'
}

const CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES = {
	name: 'string'
}

const CARD_COLUMNS = _.pick(CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES, [
	'id',
	'slug',
	'type',
	'active'
])

const isExcludedKeyword = (options, keyword) => {
	return _.includes(options.exclude, keyword)
}

const format = (value) => {
	if (_.isBoolean(value)) {
		return value ? 'true' : 'false'
	}
	if (_.isEqual(value, [])) {
		return '\'[]\'::jsonb'
	}
	return pgFormat.literal(value)
}

const getConjunction = (result, expression) => {
	if (result.length && expression.length > 0) {
		result.push('AND')
	}

	result.push(expression)

	return result
}

const getRowFromProperty = (property, asJSON = false) => {
	const row = []

	if (property.length) {
		const keys = property.slice().map((key) => {
			if (_.isArray(key)) {
				if (key[1] === true) {
					return key[0]
				}

				return format(key[0])
			}
			return format(key)
		})

		const finalKey = keys.pop()

		if (keys.length) {
			row.push(keys.join('->'))
			const selector = asJSON ? '->' : '->>'
			row.push(`${selector}${finalKey}`)
		} else {
			row.push(finalKey)
		}
	}

	return row.join('')
}

const getTypeExpression = (property, value, options) => {
	const row = getRowFromProperty(property, true)

	if (row === 'data' && value === 'object' && options.assumeValidCard) {
		return null
	}

	if (property[0] && property[0][0] === 'data' &&
			property.length === 2 &&
			options.assumeValidCard) {
		if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] &&
				CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === value) {
			return null
		}

		if (CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] &&
				CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === value) {
			return null
		}
	}

	const result = _.chain(value).castArray().map((type) => {
		// JSONB doesn't support inegers so we need to do some extra validation for
		// this type
		if (type === 'integer') {
			return `(jsonb_typeof(${row}) = 'number' AND (${row})::text::numeric % 1 = 0)`
		}
		return `jsonb_typeof(${row}) = ${format(type)}`
	}).value()

	if (result.length > 1) {
		return `(${result.join(' OR ')})`
	}

	return _.first(result)
}

const getContainsExpression = (property, value, options) => {
	const row = getRowFromProperty(property, true)
	if (_.isBoolean(value)) {
		if (value) {
			return `jsonb_array_length(${row}) > 0`
		}

		return 'false'
	}

	const conjuncts = []

	if (value.minimum) {
		const subquery = [
			`EXISTS (SELECT 1 FROM jsonb_array_elements(${row})`,
			`WHERE value >= ${format(value.minimum)})`
		].join('\n')

		if (property[0] && property[0][0] === 'data' &&
				property.length === 2 &&
				options.assumeValidCard) {
			if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] &&
					CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array') {
				conjuncts.push(`(${subquery})`)
			}

			if (CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] &&
					CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
				conjuncts.push(`(${subquery})`)
			}
		} else {
			conjuncts.push(`(jsonb_typeof(${row}) != 'array' OR ${subquery})`)
		}
	}

	if (value.const) {
		if (_.isNumber(value.const)) {
			conjuncts.push(`(${row} @> ${format(value.const)})`)
		} else {
			conjuncts.push(`(${row} ? ${format(value.const)})`)
		}
	}

	return conjuncts.join('\nAND\n')
}

// If the root JSON value is not an object things can get a bit weird.
// see https://stackoverflow.com/questions/27215216/postgres-how-to-convert-json-string-to-text
const getRootJSONB = ([ root ]) => {
	const key = _.isArray(root) ? _.first(root) : root
	return `${key}#>>'{}'`
}

const getFilterExpression = (operator, property, value, schema, root, options) => {
	let row = getRowFromProperty(property)
	switch (operator) {
		case 'type': {
			return getTypeExpression(property, value, options)
		}
		case 'const': {
			if (options.assumeValidCard &&
					property.length === 2 &&
					property[0][0] === 'data' &&
					CARD_COLUMNS[property[1]]) {
				return `${property[1]} = ${format(value)}`
			}

			return `${getRowFromProperty(property, true)} @> ${format(JSON.stringify(value))}::jsonb`
		}
		case 'pattern': {
			const patternMatchRow = property.length === 1 ? getRootJSONB(property) : row
			row = getRowFromProperty(property, true)
			const matcher = `${patternMatchRow} ~* ${format(value)}`

			if (options.assumeValidCard &&
					property.length === 2 &&
					property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'string' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'string') {
						if (CARD_COLUMNS[property[1]]) {
							return `(${property[1]} ~* ${format(value)})`
						}

						return `(${matcher})`
					}

					return null
				}
			}

			return `(jsonb_typeof(${row}) != 'string' OR ${matcher})`
		}
		case 'items': {
			row = getRowFromProperty(property, true)

			if (_.isBoolean(value)) {
				if (options.assumeValidCard &&
						property.length === 2 &&
						property[0][0] === 'data') {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
						if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array' ||
								CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
							if (value) {
								return null
							}

							return `(jsonb_array_length(${row}) = 0)`
						}

						return null
					}
				}

				if (value) {
					return [
						`(jsonb_typeof(${row}) = 'array')`
					].join('\n')
				}

				return [
					`((jsonb_typeof(${row}) = 'array') AND`,
					`(jsonb_array_length(${row}) = 0))`
				].join('\n')
			}

			if (_.isArray(value)) {
				if (_.every(value, _.isBoolean)) {
					const size = value.indexOf(false) || value.length

					if (options.assumeValidCard &&
							property.length === 2 &&
							property[0][0] === 'data') {
						if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
								CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
							if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array' ||
									CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
								return `(jsonb_array_length(${row}) <= ${format(size)})`
							}

							return null
						}
					}

					return [
						`((jsonb_typeof(${row}) != 'array')`,
						`(jsonb_array_length(${row}) <= ${format(size)}))`
					].join('\nOR\n')
				}

				const result = []

				value.forEach((subschema, index) => {
					const subproperty = property.concat([ [ index, true ] ])
					const subexpression = parseFragment(subschema, options, subproperty, root)
						.join('\n')
					result.push(`(${getRowFromProperty(subproperty, true)} IS NULL OR (${subexpression}))`)
				})

				return `(${result.join('\nAND\n')})`
			}

			const subexpression = parseFragment(value, options, [ [ 'value', true ] ], root)
				.join('\n')

			const subquery = [
				`(NOT EXISTS (SELECT 1 FROM jsonb_array_elements(${row})`,
				`WHERE (NOT ${subexpression})))`
			].join('\n')

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
						return subquery
					}

					return null
				}
			}

			return `(jsonb_typeof(${row}) != 'array' OR ${subquery})`
		}
		case 'maxItems': {
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
						return `(jsonb_array_length(${row}) <= ${format(value)})`
					}

					return null
				}
			}

			return [
				`((jsonb_typeof(${row}) != 'array')`,
				`(jsonb_array_length(${row}) <= ${format(value)}))`
			].join('\nOR\n')
		}
		case 'minItems': {
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'array' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'array') {
						return `(jsonb_array_length(${row}) >= ${format(value)})`
					}

					return null
				}
			}

			return [
				`((jsonb_typeof(${row}) != 'array')`,
				`(jsonb_array_length(${row}) >= ${format(value)}))`
			].join('\nOR\n')
		}
		case 'exclusiveMinimum':
		case 'minimum': {
			const minOp = operator === 'exclusiveMinimum' ? '>' : '>='
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'number' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'number') {
						return `((${row})::text::numeric ${minOp} ${format(value)})`
					}

					return null
				}
			}

			return `(jsonb_typeof(${row}) != 'number' OR (${row})::text::numeric ${minOp} ${format(value)})`
		}
		case 'exclusiveMaximum':
		case 'maximum': {
			const maxOp = operator === 'exclusiveMaximum' ? '<' : '<='
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'number' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'number') {
						return `((${row})::text::numeric ${maxOp} ${format(value)})`
					}

					return null
				}
			}

			return `(jsonb_typeof(${row}) != 'number' OR (${row})::text::numeric ${maxOp} ${format(value)})`
		}
		case 'maxProperties': {
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'object' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'object') {
						return `(array_length(ARRAY(SELECT jsonb_object_keys(${row})), 1) <= ${value})`
					}

					return null
				}
			}

			return [
				`((jsonb_typeof(${row}) != 'object')`,
				`(array_length(ARRAY(SELECT jsonb_object_keys(${row})), 1) <= ${value}))`
			].join('\nOR\n')
		}
		case 'minProperties': {
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'object' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'object') {
						return `(array_length(ARRAY(SELECT jsonb_object_keys(${row})), 1) >= ${value})`
					}

					return null
				}
			}

			return [
				`((jsonb_typeof(${row}) != 'object')`,
				`(array_length(ARRAY(SELECT jsonb_object_keys(${row})), 1) >= ${value}))`
			].join('\nOR\n')
		}
		case 'maxLength': {
			row = getRowFromProperty(property, true)
			const maxTargetRow = property.length === 1 && (property[0] === root || property[0][0] === root)
				? getRootJSONB(property)
				: getRowFromProperty(property)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'string' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'string') {
						return `(char_length((${maxTargetRow})::text) <= ${format(value)})`
					}

					return null
				}
			}

			return `(jsonb_typeof(to_jsonb(${row})) != 'string' OR char_length((${maxTargetRow})::text) <= ${format(value)})`
		}
		case 'minLength': {
			row = getRowFromProperty(property, true)
			const minTargetRow = property.length === 1 && (property[0] === root || property[0][0] === root)
				? getRootJSONB(property)
				: getRowFromProperty(property)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'string' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'string') {
						return `(char_length((${minTargetRow})::text) >= ${format(value)})`
					}

					return null
				}
			}

			return `(jsonb_typeof(to_jsonb(${row})) != 'string' OR char_length((${minTargetRow})::text) >= ${format(value)})`
		}
		case 'propertyNames': {
			row = getRowFromProperty(property, true)
			if (_.isBoolean(value)) {
				if (value) {
					return null
				}

				if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
						if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'object' ||
								CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'object') {
							return `(${row} = '{}')`
						}

						return null
					}
				}

				return [
					`((jsonb_typeof(to_jsonb(${row})) != 'object') OR`,
					`${row} = '{}')`
				].join('\n')
			}

			const subexpression = parseFragment(
				schema.propertyNames, options, [ [ 'key', true ] ], root).join('\n')

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'object' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'object') {
						return [
							`(NOT EXISTS (SELECT 1 FROM jsonb_each(${row})`,
							`WHERE NOT (${subexpression})))`
						].join('\n')
					}

					return null
				}
			}

			return [
				`((jsonb_typeof(${row}) != 'object') OR`,
				`(NOT EXISTS (SELECT 1 FROM jsonb_each(${row})`,
				`WHERE NOT (${subexpression}))))`
			].join('\n')
		}
		case 'enum': {
			row = getRowFromProperty(property, true)
			const cases = value.map((item) => {
				return `${row} @> ${format(JSON.stringify(item))}::jsonb`
			})

			return `(${cases.join(' OR ')})`
		}
		case 'contains': {
			return getContainsExpression(property, value, options)
		}
		case 'multipleOf': {
			row = getRowFromProperty(property, true)

			if (options.assumeValidCard && property.length === 2 && property[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[property[1]] === 'number' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[property[1]] === 'number') {
						return `((${row})::text::numeric % ${format(value)} = 0)`
					}

					return null
				}
			}

			return [
				`(jsonb_typeof(${row}) != 'number')`,
				`(${row})::text::numeric % ${format(value)} = 0`
			].join('\nOR\n')
		}
		case 'format': {
			if (property.length === 1) {
				row = getRootJSONB(property)
			}

			if (value === 'uuid') {
				if (options.assumeValidCard &&
						property.length === 2 &&
						property[0][0] === 'data' &&
						property[1] === 'id') {
					return null
				}

				return `${row} ~* '${REGEXES.format.uuid}'`
			}

			if (value === 'email') {
				return `${row} ~* '${REGEXES.format.email}'`
			}

			if (value === 'date-time') {
				return `${row} ~* '${REGEXES.format.datetime}'`
			}

			if (value === 'uri') {
				return `${row} ~* ${format(REGEXES.format.uri)}`
			}

			if (value === 'hostname') {
				return `${row} ~* ${format(REGEXES.format.hostname)}`
			}

			if (value === 'ipv6') {
				return `${row} ~* ${format(REGEXES.format.ipv6)}`
			}

			if (value === 'ipv4') {
				return `${row} ~* ${format(REGEXES.format.ipv4)}`
			}

			if (value === 'json-pointer') {
				return `${row} ~* ${format(REGEXES.format.jsonpointer)}`
			}

			if (value === 'uri-reference') {
				return `${row} ~* ${format(REGEXES.format.urireference)}`
			}

			if (value === 'uri-template') {
				return `${row} ~* ${format(REGEXES.format.uritemplate)}`
			}

			throw new Error(`Unsupported format: ${value}`)
		}
		default: {
			return null
		}
	}
}

const parseFragment = (fragment, options, name = [], root) => {
	if (fragment.type === 'object' || _.has(fragment, [ 'properties' ])) {
		let result = []
		if (fragment.type === 'object') {
			const typeExpression = getTypeExpression(name, 'object', options)
			if (typeExpression) {
				result.push(typeExpression)
			}
		}

		if (fragment.properties) {
			for (const property of Object.keys(fragment.properties)) {
				const value = fragment.properties[property]
				const path = name.concat([ property ])

				if (_.isBoolean(value)) {
					if (!value) {
						const row = getRowFromProperty(path, true)

						if (options.assumeValidCard && path.length === 2 && path[0][0] === 'data') {
							if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[path[1]]) {
								return [ 'false' ]
							}
						}

						return [
							`(${row} IS NULL)`
						]
					}
				}

				// If the value has an empty "not" property, then this property is
				// considered to be forbidden
				// see: https://github.com/json-schema-org/JSON-Schema-Test-Suite/blob/master/tests/draft4/not.json#L74
				if (value.not && _.isEmpty(value.not)) {
					const row = getRowFromProperty(path)
					if (options.assumeValidCard &&
							path.length === 2 &&
							path[0][0] === 'data' &&
							CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[path[1]]) {
						result = getConjunction(result, 'false')
					} else {
						const expression = `${row} IS NULL`
						result = getConjunction(result, expression)
					}
				} else if (fragment.required && fragment.required.includes(property)) {
					const expression = parseFragment(value, options, path, root)
					if (expression && expression.length) {
						result = getConjunction(result, expression)
					}
				} else {
					const parsed = parseFragment(value, options, path, root)
					if (parsed && parsed.length) {
						if (options.assumeValidCard &&
								path.length === 2 &&
								path[0][0] === 'data' &&
								CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[path[1]]) {
							result = getConjunction(result, `(${parsed.join('\n')})`)
						} else {
							const expression = _.flattenDeep([
								'(',
								`${getRowFromProperty(path, true)} IS NULL`,
								'OR (',
								parsed,
								'))'
							])

							result = getConjunction(result, expression)
						}
					}
				}
			}
		}

		if (fragment.required && fragment.required.length) {
			const requirements = fragment.required.reduce((accumulator, property) => {
				const path = name.concat([ property ])
				const row = getRowFromProperty(path, true)

				if (path[0] && path[0][0] === 'data' && path.length === 2 && options.assumeValidCard) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[path[1]]) {
						return accumulator
					}
				}

				accumulator.push(`${row} IS NOT NULL`)
				return accumulator
			}, [])

			const expression = []

			if (name.length !== 1 || name[0][0] !== 'data' || !options.assumeValidCard) {
				if (!options.assumeValidCard ||
						name.length !== 2 ||
						name[0][0] !== 'data' ||
						(CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[name[1]] !== 'object' &&
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[name[1]] !== 'object')) {
					expression.push(`jsonb_typeof(${getRowFromProperty(name, true)}) != 'object'`)
				}
			}

			if (requirements.length > 0) {
				expression.push(`(${requirements.join('\nAND\n')})`)
			}

			if (expression.length > 0) {
				result = getConjunction(result, `(${expression.join(' OR ')})`)
			}
		}

		if (fragment.not) {
			if (!fragment.not.type) {
				fragment.not.type = fragment.type
			}
			if (!fragment.not.required) {
				fragment.not.required = fragment.required
			}
			const expression = _.flattenDeep([
				'NOT',
				'(',
				parseFragment(fragment.not, options, name, root),
				')'
			])
			result = getConjunction(result, expression)
		}

		if (fragment.allOf) {
			const subresult = fragment.allOf.map((conjunct) => {
				const copy = Object.assign({}, fragment, conjunct)
				Reflect.deleteProperty(copy, 'allOf')
				const exprs = parseFragment(copy, options, name, root)
				return exprs.length > 1
					? `(\n${exprs.join('\n')}\n)`
					: exprs
			}).join('\nAND\n')

			result = getConjunction(result, subresult)
		}

		if (fragment.anyOf) {
			const subresult = fragment.anyOf.map((disjunct) => {
				const copy = Object.assign({}, fragment, disjunct)
				Reflect.deleteProperty(copy, 'anyOf')
				const exprs = parseFragment(copy, options, name, root)
				return exprs.length > 1
					? `(\n${exprs.join('\n')}\n)`
					: exprs
			}).join('\nOR\n')

			if (subresult) {
				result = getConjunction(result, `(\n${subresult}\n)`)
			}
		}

		if (
			!isExcludedKeyword(options, 'additionalProperties') &&
			fragment.additionalProperties === false
		) {
			const keys = Object.keys(fragment.properties)
			const row = getRowFromProperty(name, true)

			const subexpression = keys.map((key) => {
				return `key != ${format(key)}`
			})

			if (fragment.patternProperties) {
				const patternProperties = _.map(fragment.patternProperties, (subSchema, pattern) => {
					if (subSchema === true) {
						return `(key ~ ${format(pattern)})`
					}
					if (subSchema === false) {
						return `(key !~ ${format(pattern)})`
					}
					const conjunct = parseFragment(subSchema, options, [ [ 'value', true ] ], root)
					if (!conjunct.length) {
						return `(key !~ ${format(pattern)})`
					}

					return `(key !~ ${format(pattern)} OR ${conjunct})`
				})

				subexpression.push(`(${patternProperties.join(' AND ')})`)
			}

			if (options.assumeValidCard && name.length === 2 && name[0][0] === 'data') {
				if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[name[1]] ||
						CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[name[1]]) {
					if (CARD_TOP_LEVEL_REQUIRED_FIELD_TYPES[name[1]] === 'object' ||
							CARD_TOP_LEVEL_OPTIONAL_FIELD_TYPES[name[1]] === 'object') {
						result = getConjunction(result,
							`(NOT EXISTS (SELECT 1 FROM jsonb_each(${row}) WHERE (${subexpression.join('\nAND\n')})))`
						)
					} else {
						result = getConjunction(result, 'true')
					}
				} else {
					result = getConjunction(
						result,
						[
							`(jsonb_typeof(${row}) != 'object' OR`,
							`NOT EXISTS (SELECT 1 FROM jsonb_each(${row}) WHERE (${subexpression.join('\nAND\n')})))`
						].join('\n')
					)
				}
			} else {
				result = getConjunction(
					result,
					[
						`(jsonb_typeof(${row}) != 'object' OR`,
						`NOT EXISTS (SELECT 1 FROM jsonb_each(${row}) WHERE (${subexpression.join('\nAND\n')})))`
					].join('\n')
				)
			}
		}

		if (!isExcludedKeyword(options, 'additionalProperties') &&
			_.isPlainObject(fragment.additionalProperties)) {
			const keys = Object.keys(fragment.properties)
			const row = getRowFromProperty(name, true)

			const filter = parseFragment(
				fragment.additionalProperties, options, [ [ 'value', true ] ], root)

			const subexpression = [
				[
					'(',
					keys.map((key) => {
						return `key != ${format(key)}`
					}).concat([ `NOT (${filter.join('\nAND\n')})` ])
						.concat(Object.keys(fragment.patternProperties || []).map((pattern) => {
							return `(key !~ ${format(pattern)})`
						}))
						.join('\nAND\n'),
					')'
				].join(' ')
			]

			if (fragment.patternProperties) {
				const patternProperties = _.map(fragment.patternProperties, (subSchema, pattern) => {
					if (subSchema === true) {
						return `(key !~ ${format(pattern)})`
					}
					if (subSchema === false) {
						return `(key ~ ${format(pattern)})`
					}
					const conjunct = parseFragment(subSchema, options, [ [ 'value', true ] ], root)
					if (!conjunct.length) {
						return `(key ~ ${format(pattern)})`
					}

					return `(key ~ ${format(pattern)} AND NOT (${conjunct}))`
				})

				subexpression.push(`(${patternProperties.join(' AND ')})`)
			}

			result = getConjunction(result, [
				`(jsonb_typeof(${row}) != 'object' OR`,
				`NOT EXISTS (SELECT 1 FROM jsonb_each(${row})`,
				`WHERE (${subexpression.join('\nOR\n')})))`
			].join('\n'))
		}

		return _.flattenDeep(result) || true
	}

	let result = []

	if (!isExcludedKeyword(options, 'additionalProperties') &&
		_.isPlainObject(fragment.additionalProperties)) {
		const row = getRowFromProperty(name, true)

		const filter = parseFragment(
			fragment.additionalProperties, options, [ [ 'value', true ] ], root)
		const subexpression = [ `NOT (${filter.join('\nAND\n')})` ].join('\nAND\n')

		result = getConjunction(result, [
			`(jsonb_typeof(${row}) != 'object' OR`,
			`NOT EXISTS (SELECT 1 FROM jsonb_each(${row}) WHERE ${subexpression}))`
		].join('\n'))
	}

	for (const property of Object.keys(fragment)) {
		const value = fragment[property]
		if (property === 'not' && value !== false) {
			// If `not: true` then no value is valid
			// see https://github.com/json-schema-org/JSON-Schema-Test-Suite/blob/master/tests/draft6/not.json#L96
			if (value === true) {
				result = getConjunction(result, '(1 = 2)')
			} else {
				const expression = _.flattenDeep([
					'(',
					`${getRowFromProperty(name)} IS NULL`,
					'OR',
					'NOT',
					'(',
					parseFragment(fragment.not, options, name, root),
					')',
					')'
				])
				result = getConjunction(result, expression)
			}
		} else if (
			(property === 'anyOf' && !_.includes(value, true)) ||
			(property === 'allOf' && !_.every(value, (val) => {
				return val === true
			}))
		) {
			// If all anyOf values are false, the schema will never be valid
			// see https://github.com/json-schema-org/JSON-Schema-Test-Suite/blob/master/tests/draft6/anyOf.json#L91
			if (
				(property === 'anyOf' && _.compact(value).length === 0) ||
				(property === 'allOf' && _.includes(value, false))
			) {
				result = getConjunction(result, '(1 = 2)')
			} else {
				const operatorResult = value.map((disjunct) => {
					return `(${parseFragment(disjunct, options, name, root).join('\n')})`
				}).filter((disjunct) => {
					return disjunct !== '()'
				})

				if (operatorResult.length) {
					const joinLogic = property === 'anyOf' ? 'OR' : 'AND'
					result = getConjunction(result, `(\n${operatorResult.join(`\n${joinLogic}\n`)}\n)`)
				}
			}
		} else if (property === 'patternProperties') {
			const row = getRowFromProperty(name, true)

			const subexpression = _.map(value, (subSchema, pattern) => {
				if (subSchema === true) {
					return `(key ~ ${format(pattern)})`
				}
				if (subSchema === false) {
					return `(key !~ ${format(pattern)})`
				}
				const conjunct = parseFragment(subSchema, options, [ [ 'value', true ] ], root)
				if (!conjunct.length) {
					return `(key !~ ${format(pattern)})`
				}

				return `(key !~ ${format(pattern)} OR ${conjunct})`
			})

			const expression = _.flattenDeep([
				'(',
				`jsonb_typeof(${row}) != 'object'`,
				'OR',
				'NOT EXISTS',
				'(',
				`SELECT 1 FROM jsonb_each(${row})`,
				_.isNil(fragment.additionalProperties) ? 'WHERE NOT' : 'WHERE',
				'(',
				subexpression.join('\nAND\n'),
				')',
				')',
				')'
			]).join('\n')

			result = getConjunction(result, `(\n${expression}\n)`)
		} else {
			const expression = getFilterExpression(property, name, value, fragment, root, options)
			if (expression) {
				result = getConjunction(result, expression)
			}
		}
	}

	return _.flattenDeep(result)
}

module.exports = (table, schema, options = {}) => {
	const ROOT = 'data'

	let query = [
		`SELECT ${ROOT} FROM ${table}`
	]

	if (_.isBoolean(schema)) {
		if (!schema) {
			query.push('WHERE false')
		}

		return query.join('\n')
	}

	if (!_.isPlainObject(schema)) {
		throw new Error(`schema should be an object, received: ${schema}`)
	}

	const filter = parseFragment(schema, options, [ [ ROOT, true ] ], ROOT)

	if (!Array.isArray(filter) || filter.length > 0) {
		filter.unshift('WHERE')
		query = query.concat(_.flattenDeep(filter))
	}

	if (options.sortBy) {
		const orderBy = [
			'ORDER BY',
			getRowFromProperty([ [ ROOT, true ] ].concat(_.castArray(options.sortBy))),
			options.sortDir === 'desc' ? 'DESC' : 'ASC'
		].join(' ')

		query.push(orderBy)
	}

	if (options.skip) {
		if (!_.isNumber(options.skip)) {
			throw new Error(`options.skip should be a number, received: ${options.skip}`)
		}
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		if (!_.isNumber(options.limit)) {
			throw new Error(`options.limit should be a number, received: ${options.limit}`)
		}
		query.push(`LIMIT ${options.limit}`)
	}

	return query.join('\n')
}
