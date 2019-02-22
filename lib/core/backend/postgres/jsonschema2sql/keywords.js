/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const REGEXES = require('./regexes')

exports.type = (value, path, walk, schema, context) => {
	if (Array.isArray(value)) {
		return builder.or(...value.map((type) => {
			if (context && context.items === type) {
				return true
			}

			return builder.isOfType(path, type)
		}))
	}

	if (context && context.items === value) {
		return true
	}

	return builder.isOfType(path, value)
}

exports.const = (value, path, walk, schema, context) => {
	if (
		(builder.isColumn(path) && !builder.columnIsOfType(path, 'object')) ||
		(context && context.items !== 'array' && context.items !== 'object')
	) {
		const postgresValue = _.isString(value)
			? builder.valueToPostgres(value)
			: builder.valueToPostgres(JSON.stringify(value))
		return `${builder.getProperty(path)} = ${postgresValue}`
	}

	const postgresValue =
		builder.valueToPostgres(JSON.stringify(value))
	return `${builder.getProperty(path)} @> ${postgresValue}`
}

exports.pattern = (value, path, walk, schema, context) => {
	const selector = builder.getProperty(path, {
		text: true
	})

	if (context) {
		if (context.items === 'string') {
			return `${selector} ~* ${builder.valueToPostgres(value)}`
		}

		return builder.or(
			builder.isNotOfType(path, 'string'),
			`${selector} ~* ${builder.valueToPostgres(value)}`)
	}

	if (builder.isPrefixedProperty(path)) {
		return builder.or(
			builder.isNotOfType(path, 'string'),
			`${selector} ~* ${builder.valueToPostgres(value)}`)
	}

	return builder.or(
		builder.isNotOfType(path, 'string'),
		`(${selector}#>>'{}')::text ~* ${builder.valueToPostgres(value)}`)
}

exports.enum = (value, path, walk, schema, context) => {
	return builder.or(
		builder.notExists(path),
		builder.or(...value.map((expression) => {
			return exports.const(expression, path, walk, schema, context)
		})))
}

exports.required = (value, path, walk, schema) => {
	return builder.or(
		builder.isNotOfType(path, 'object'),
		builder.and(...value.map((name) => {
			// Ignore requirement if the property is defined
			// and has a default value.
			if (schema.properties &&
				schema.properties[name] &&
				!_.isNil(schema.properties[name].default)) {
				return true
			}

			return builder.exists(path.concat([ name ]))
		})))
}

exports.properties = (value, path, walk, schema, context, onKey) => {
	return builder.and(...Object.entries(value).map(([ key, subschema ]) => {
		if (!subschema) {
			return false
		}

		return builder.or(
			builder.notExists(path.concat([ key ])),
			walk(subschema, path.concat([ key ]), context, onKey).sql)
	}))
}

exports.minItems = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'array'),
		`jsonb_array_length(${builder.getProperty(path)}) >= ${postgresValue}`)
}

exports.maxItems = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'array'),
		`jsonb_array_length(${builder.getProperty(path)}) <= ${postgresValue}`)
}

exports.maximum = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'number'),
		`(${builder.getProperty(path)})::text::numeric <= ${postgresValue}`)
}

exports.minimum = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'number'),
		`(${builder.getProperty(path)})::text::numeric >= ${postgresValue}`)
}

exports.exclusiveMaximum = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'number'),
		`(${builder.getProperty(path)})::text::numeric < ${postgresValue}`)
}

exports.exclusiveMinimum = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'number'),
		`(${builder.getProperty(path)})::text::numeric > ${postgresValue}`)
}

exports.maxLength = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	const selector = builder.getProperty(path, {
		text: true
	})

	return builder.or(
		builder.isNotOfType(path, 'string'),
		`char_length((${selector})::text) <= ${postgresValue}`)
}

exports.minLength = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	const selector = builder.getProperty(path, {
		text: true
	})

	return builder.or(
		builder.isNotOfType(path, 'string'),
		`char_length((${selector})::text) >= ${postgresValue}`)
}

exports.multipleOf = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'number'),
		`(${builder.getProperty(path)})::text::numeric % ${postgresValue} = 0`)
}

exports.format = (value, path, walk, schema, context) => {
	const regex = REGEXES.format[value]
	if (!regex) {
		return false
	}

	return exports.pattern(regex, path, walk, schema, context)
}

exports.propertyNames = (value, path, walk, schema, context, onKey) => {
	if (value === true) {
		return true
	}

	const subexpression = walk(value, [ null, 'key' ], context, onKey)
	return builder.or(
		builder.isNotOfType(path, 'object'),
		builder.noneObject(path, builder.not(subexpression.sql)))
}

exports.maxProperties = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'object'),
		`array_length(${builder.keys(path)}, 1) <= ${postgresValue}`)
}

exports.minProperties = (value, path) => {
	const postgresValue = builder.valueToPostgres(value)
	return builder.or(
		builder.isNotOfType(path, 'object'),
		`array_length(${builder.keys(path)}, 1) >= ${postgresValue}`)
}

// A placeholder as this property is really
// implemented as part as "required"
exports.default = _.constant(true)

exports.contains = (value, path, walk, schema, context, onKey) => {
	return builder.or(
		builder.isNotOfType(path, 'array'),
		builder.someArray(path, value, walk, context, onKey))
}

exports.items = (value, path, walk, schema, context, onKey) => {
	if (!value) {
		return `jsonb_array_length(${builder.getProperty(path)}) = 0`
	}

	if (Array.isArray(value)) {
		const limit = value.indexOf(false)
		const length = limit < 0 ? value.length : limit + 1

		const subexpression =
			builder.and(...value.slice(0, length).map((expression, index) => {
				return walk(expression, path.concat([ index ]), context, onKey).sql
			}))

		const typeExpression = builder.or(
			builder.isNotOfType(path, 'array'),
			[
				`jsonb_array_length(${builder.getProperty(path)})`,
				'<',
				builder.valueToPostgres(length)
			].join(' '))

		if (subexpression === true) {
			return typeExpression
		}

		return builder.or(typeExpression, subexpression)
	}

	return builder.or(
		builder.isNotOfType(path, 'array'),
		builder.everyArray(path, value, walk, onKey))
}

exports.anyOf = (value, path, walk, schema, context, onKey) => {
	return builder.or(...value.map((subschema) => {
		return walk(subschema, path, context, onKey).sql
	}))
}

exports.allOf = (value, path, walk, schema, context, onKey) => {
	return builder.and(...value.map((subschema) => {
		return walk(subschema, path, context, onKey).sql
	}))
}

exports.not = (value, path, walk, schema, context, onKey) => {
	return builder.not(walk(value, path, context, onKey).sql)
}

exports.patternProperties = (value, path, walk, schema, context, onKey) => {
	if (!_.isNil(schema.additionalProperties)) {
		return true
	}

	const subexpression = builder.and(...Object.entries(value)
		.map(([ key, subschema ]) => {
			if (_.isEqual(subschema, {})) {
				return `key ~ ${builder.valueToPostgres(key)}`
			}

			return builder.or(
				`key !~ ${builder.valueToPostgres(key)}`,
				walk(subschema, [ null, 'value' ], context, onKey).sql)
		}))

	return builder.or(
		builder.isNotOfType(path, 'object'),
		builder.noneObject(path, builder.not(subexpression)))
}

exports.additionalProperties = (value, path, walk, schema, context, onKey) => {
	if (builder.isRootProperty(path) || (builder.isTopLevelProperty(path) && !value)) {
		return true
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

			return builder.or(
				`key !~ ${builder.valueToPostgres(pattern)}`,
				walk(subschema, [ null, 'value' ], context, onKey).sql)
		}))

	const subexpression = builder.and(
		propertiesTest, patternPropertiesTest)

	if (!value) {
		return builder.or(
			builder.isNotOfType(path, 'object'),
			builder.noneObject(path, subexpression))
	}

	if (value === true) {
		return true
	}

	return builder.or(
		builder.isNotOfType(path, 'object'),
		builder.noneObject(path, builder.and(
			subexpression,
			builder.not(walk(value, [ null, 'value' ], context, onKey).sql))))
}
