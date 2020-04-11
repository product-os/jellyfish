/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const REGEXES = require('./regexes')

exports.type = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (Array.isArray(value)) {
		return {
			keys,
			filter: builder.or(...value.map((type) => {
				if (context && context.items === type) {
					return true
				}

				return builder.isOfType(path, type)
			}))
		}
	}

	if (context && context.items === value) {
		return {
			keys,
			filter: true
		}
	}

	if (builder.shortcuts.isJsonArrayContainsStringOrNumber(path, schema)) {
		return {
			keys,
			filter: builder.shortcuts.jsonArrayContainsStringOrNumber(path, schema),
			shortcut: true
		}
	}

	if (_.has(schema, [ 'const' ])) {
		return {
			keys,
			filter: true
		}
	}

	return {
		keys,
		filter: builder.isOfType(path, value)
	}
}

exports.const = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (
		(builder.isColumn(path) && !builder.columnIsOfType(path, 'object')) ||
		(context && context.items !== 'array' && context.items !== 'object')
	) {
		const postgresValue = _.isString(value)
			? builder.valueToPostgres(value)
			: builder.valueToPostgres(JSON.stringify(value))
		return {
			keys,
			filter: `${builder.getProperty(path)} = ${postgresValue}`
		}
	}

	const postgresValue =
		builder.valueToPostgres(JSON.stringify(value))
	return {
		keys,
		filter: `${builder.getProperty(path)} @> ${postgresValue}`
	}
}

exports.pattern = (value, path, walk, schema, context, keys, requiredPaths) => {
	const selector = builder.getProperty(path, {
		text: true
	})

	if (context) {
		if (context.items === 'string') {
			return {
				keys,
				filter: `${selector} ~ ${builder.valueToPostgres(value)}`
			}
		}

		return {
			keys,
			filter: builder.or(
				builder.isNotOfType(path, 'string'),
				`${selector} ~ ${builder.valueToPostgres(value)}`)
		}
	}

	if (builder.isPrefixedProperty(path)) {
		return {
			keys,
			filter: builder.or(
				builder.isNotOfType(path, 'string'),
				`${selector} ~ ${builder.valueToPostgres(value)}`)
		}
	}

	let filter = `(${selector}#>>'{}')::text ~ ${builder.valueToPostgres(value)}`
	if (!schema.type || schema.type !== 'string') {
		filter = builder.or(builder.isNotOfType(path, 'string'), filter)
	}

	return {
		keys,
		filter
	}
}

exports.regexp = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (_.isEmpty(value.pattern)) {
		return {
			keys,
			filter: true
		}
	}

	const selector = builder.getProperty(path, {
		text: true
	})

	const pattern = value.pattern

	const operator = value.flags === 'i' ? '~*' : '~'

	if (context) {
		if (context.items === 'string') {
			return {
				keys,
				filter: `${selector} ${operator} ${builder.valueToPostgres(pattern)}`
			}
		}

		return {
			keys,
			filter: builder.or(
				builder.isNotOfType(path, 'string'),
				`${selector} ${operator} ${builder.valueToPostgres(pattern)}`)
		}
	}

	if (builder.isPrefixedProperty(path)) {
		return {
			keys,
			filter: builder.or(
				builder.isNotOfType(path, 'string'),
				`${selector}::text ${operator} ${builder.valueToPostgres(pattern)}`)
		}
	}

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'string'),
			`(${selector}#>>'{}')::text ${operator} ${builder.valueToPostgres(pattern)}`)
	}
}

exports.enum = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (builder.isTopLevelProperty(path) && value.length > 0) {
		const values = []

		for (const element of value) {
			if (!element || element.length <= 0) {
				return {
					keys,
					filter: builder.or(builder.notExists(path, requiredPaths),
						builder.or(...value.map((expression) => {
							const subexpression = exports.const(
								expression, path, walk, schema, context, keys, requiredPaths)
							return subexpression.filter
						})))
				}
			}

			values.push(`'${element}'`)
		}

		return {
			keys,
			filter: builder.or(builder.notExists(path, requiredPaths),
				`${builder.getProperty(path)} IN (${values.join(', ')})`)
		}
	}

	return {
		keys,
		filter: builder.or(builder.notExists(path, requiredPaths),
			builder.or(...value.map((expression) => {
				const subexpression = exports.const(
					expression, path, walk, schema, context, keys, requiredPaths)
				return subexpression.filter
			})))
	}
}

exports.required = (value, path, walk, schema, context, keys, requiredPaths) => {
	value.forEach((requiredPath) => {
		requiredPaths.add(path.concat(requiredPath).toString())
	})

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			builder.and(...value.map((name) => {
				// Ignore requirement if the property is defined
				if (schema.properties && !_.isEmpty(schema.properties[name])) {
					return true
				}

				return builder.exists(path.concat([ name ]))
			})))
	}
}

exports.properties = (value, path, walk, schema, context, keys, requiredPaths) => {
	return {
		keys,
		filter: builder.and(...Object.entries(value).map(([ key, subschema ]) => {
			if (!subschema) {
				return false
			}

			const subexpression = walk(
				subschema, path.concat([ key ]), context, keys, requiredPaths)

			return builder.or(
				builder.notExists(path.concat([ key ]), requiredPaths),
				subexpression.filter)
		}))
	}
}

exports.minItems = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)

	if (builder.isColumn(path)) {
		return {
			keys,
			filter: `cardinality(${builder.getProperty(path)}) >= ${postgresValue}`
		}
	}

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'array'),
			`jsonb_array_length(${builder.getProperty(path)}) >= ${postgresValue}`)
	}
}

exports.maxItems = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)

	if (builder.isColumn(path)) {
		return {
			keys,
			filter: `cardinality(${builder.getProperty(path)}) <= ${postgresValue}`
		}
	}

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'array'),
			`jsonb_array_length(${builder.getProperty(path)}) <= ${postgresValue}`)
	}
}

exports.maximum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'number'),
			`(${builder.getProperty(path)})::text::numeric <= ${postgresValue}`)
	}
}

exports.minimum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'number'),
			`(${builder.getProperty(path)})::text::numeric >= ${postgresValue}`)
	}
}

const formatToPostgresType = (format) => {
	if (format === 'date') {
		return 'date'
	} else if (format === 'time') {
		return 'time'
	} else if (format === 'date-time') {
		return 'timestamp'
	}

	throw new Error(`Format '${format}' can't be converted to a postgres type`)
}

exports.formatMaximum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	const postgresType = formatToPostgresType(schema.format)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'string'),
			`(${builder.getProperty(path)})::text::${postgresType} <= ${postgresValue}`)
	}
}

exports.formatMinimum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	const postgresType = formatToPostgresType(schema.format)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'string'),
			`(${builder.getProperty(path)})::text::${postgresType} >= ${postgresValue}`)
	}
}

exports.exclusiveMaximum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'number'),
			`(${builder.getProperty(path)})::text::numeric < ${postgresValue}`)
	}
}

exports.exclusiveMinimum = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'number'),
			`(${builder.getProperty(path)})::text::numeric > ${postgresValue}`)
	}
}

exports.maxLength = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	const selector = builder.getProperty(path, {
		text: true
	})

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'string'),
			`char_length((${selector})::text) <= ${postgresValue}`)
	}
}

exports.minLength = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	const selector = builder.getProperty(path, {
		text: true
	})

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'string'),
			`char_length((${selector})::text) >= ${postgresValue}`)
	}
}

exports.multipleOf = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'number'),
			`(${builder.getProperty(path)})::text::numeric % ${postgresValue} = 0`)
	}
}

exports.format = (value, path, walk, schema, context, keys, requiredPaths) => {
	const regex = REGEXES.format[value]
	if (!regex) {
		return {
			keys,
			filter: false
		}
	}

	const subexpression =
		exports.pattern(regex, path, walk, schema, context, keys, requiredPaths)

	return {
		keys,
		filter: subexpression.filter
	}
}

exports.propertyNames = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (value === true) {
		return {
			keys,
			filter: true
		}
	}

	const subexpression = walk(value, [ null, 'key' ], context, keys, requiredPaths)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			builder.noneObject(path, builder.not(subexpression.filter)))
	}
}

exports.maxProperties = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			`array_length(${builder.keys(path)}, 1) <= ${postgresValue}`)
	}
}

exports.minProperties = (value, path, walk, schema, context, keys, requiredPaths) => {
	const postgresValue = builder.valueToPostgres(value)
	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			`array_length(${builder.keys(path)}, 1) >= ${postgresValue}`)
	}
}

// A placeholder as this property is really
// implemented as part as "required"
exports.default = (value, path, walk, schema, context, keys, requiredPaths) => {
	return {
		keys,
		filter: true
	}
}

exports.contains = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (builder.isFullTextSearchCapable(path)) {
		return {
			keys,
			filter: builder.fullTextSearch(path, value)
		}
	}

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'array'),
			builder.someArray(path, value, walk, context))
	}
}

exports.items = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (!value) {
		return {
			keys,
			filter: `jsonb_array_length(${builder.getProperty(path)}) = 0`
		}
	}

	if (Array.isArray(value)) {
		const limit = value.indexOf(false)
		const length = limit < 0 ? value.length : limit + 1

		const subexpression =
			builder.and(...value.slice(0, length).map((expression, index) => {
				const result =
					walk(expression, path.concat([ index ]), context, keys, requiredPaths)
				return result.filter
			}))

		const typeExpression = builder.or(
			builder.isNotOfType(path, 'array'),
			[
				`jsonb_array_length(${builder.getProperty(path)})`,
				'<',
				builder.valueToPostgres(length)
			].join(' '))

		if (subexpression === true) {
			return {
				keys,
				filter: typeExpression
			}
		}

		return {
			keys,
			filter: builder.or(typeExpression, subexpression)
		}
	}

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'array'),
			builder.everyArray(path, value, walk))
	}
}

exports.anyOf = (value, path, walk, schema, context, keys, requiredPaths) => {
	return {
		keys,
		filter: builder.or(...value.map((subschema) => {
			const subexpression = walk(subschema, path, context, keys, requiredPaths)
			return subexpression.filter
		}))
	}
}

exports.allOf = (value, path, walk, schema, context, keys, requiredPaths) => {
	return {
		keys,
		filter: builder.and(...value.map((subschema) => {
			const subexpression = walk(subschema, path, context, keys, requiredPaths)
			return subexpression.filter
		}))
	}
}

exports.not = (value, path, walk, schema, context, keys, requiredPaths) => {
	const subexpression = walk(value, path, context, keys, requiredPaths)
	return {
		keys,
		filter: builder.not(subexpression.filter)
	}
}

exports.patternProperties = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (!_.isNil(schema.additionalProperties)) {
		return {
			keys,
			filter: true
		}
	}

	const subexpression = builder.and(...Object.entries(value)
		.map(([ key, subschema ]) => {
			if (_.isEqual(subschema, {})) {
				return `key ~ ${builder.valueToPostgres(key)}`
			}

			const result = walk(subschema, [ null, 'value' ], context, keys, requiredPaths)
			return builder.or(
				`key !~ ${builder.valueToPostgres(key)}`,
				result.filter)
		}))

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			builder.noneObject(path, builder.not(subexpression)))
	}
}

exports.additionalProperties = (value, path, walk, schema, context, keys, requiredPaths) => {
	if (builder.isRootProperty(path) || (builder.isTopLevelProperty(path) && !value)) {
		return {
			keys,
			filter: true
		}
	}

	const propertiesTest = builder.and(
		...Object.keys(schema.properties || {}).map((property) => {
			return `key != ${builder.valueToPostgres(property)}`
		}))

	const patternPropertiesTest = builder.and(
		...Object.entries(schema.patternProperties || {}).map(([ pattern, subschema ]) => {
			if (_.isEqual(subschema, {})) {
				return `key !~ ${builder.valueToPostgres(pattern)}`
			}

			const subexpression =
				walk(subschema, [ null, 'value' ], context, keys, requiredPaths)

			return builder.or(
				`key !~ ${builder.valueToPostgres(pattern)}`,
				subexpression.filter)
		}))

	const subexpression = builder.and(
		propertiesTest, patternPropertiesTest)

	if (!value) {
		return {
			keys,
			filter: builder.or(
				builder.isNotOfType(path, 'object'),
				builder.noneObject(path, subexpression))
		}
	}

	if (value === true) {
		return {
			keys,
			filter: true
		}
	}

	const result =
		walk(value, [ null, 'value' ], context, keys, requiredPaths)

	return {
		keys,
		filter: builder.or(
			builder.isNotOfType(path, 'object'),
			builder.noneObject(path, builder.and(
				subexpression,
				builder.not(result.filter))))
	}
}
