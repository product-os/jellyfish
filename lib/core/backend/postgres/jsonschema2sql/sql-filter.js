/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')

// Some string constants so that we get errors on typos instead of silent bugs
const AND = 'AND'
const OR = 'OR'

const boolConstFold = {
	AND: {
		true: (other) => {
			return other
		},
		false: () => {
			return [ false ]
		}
	},
	OR: {
		true: () => {
			return [ true ]
		},
		false: (other) => {
			return other
		}
	}
}

/**
 * A class wrapping an SQL filter/condition/constraint. The main purpose of
 * this class is to abstract away individual tests (i.e. equaliy or null tests)
 * and to provide a way to combine filters using logical operators in a
 * convenient way. Parenthesis are also reduced to make debugging easier.
 */
module.exports = class SqlFilter {
	static isNotNull (query) {
		return new SqlFilter(`${query.pathToSqlField()} IS NOT NULL`)
	}

	static isNull (query) {
		return new SqlFilter(`${query.pathToSqlField()} IS NULL`)
	}

	static isEqual (query, values) {
		let hasNull = false
		const text = []
		const nonText = []
		for (const value of values) {
			if (value === null) {
				hasNull = true
			} else if (_.isString(value)) {
				text.push(pgFormat.literal(value))
			} else {
				nonText.push(SqlFilter.maybeJsonLiteral(query, value))
			}
		}

		const textCast = query.isProcessingJsonProperty ? '::text' : ''
		const filter = new SqlFilter(false)
		if (hasNull) {
			let nullFilter = null
			if (query.isProcessingJsonProperty) {
				nullFilter = new SqlFilter(`${query.pathToSqlField()} = 'null'`)
			} else {
				nullFilter = SqlFilter.isNull(query)
			}
			filter.or(nullFilter)
		}
		if (text.length === 1) {
			const field = query.pathToSqlField({
				asText: true
			})
			filter.or(new SqlFilter(`(${field})${textCast} = ${text[0]}`))
		} else if (text.length > 1) {
			const field = query.pathToSqlField({
				asText: true
			})
			filter.or(new SqlFilter(`(${field})${textCast} IN (${text.join(',')})`))
		}
		if (nonText.length === 1) {
			filter.or(new SqlFilter(`${query.pathToSqlField()} = ${nonText[0]}`))
		} else if (nonText.length > 1) {
			filter.or(new SqlFilter(`${query.pathToSqlField()} IN (${nonText.join(',')})`))
		}

		return filter
	}

	static valueIs (query, operator, value) {
		const literal = SqlFilter.maybeJsonLiteral(query, value)

		return new SqlFilter(`${query.pathToSqlField()} ${operator} ${literal}`)
	}

	static isOfJsonTypes (query, types) {
		const getType = `jsonb_typeof(${query.pathToSqlField()})`
		const literals = types.map((type) => {
			return pgFormat.literal(type)
		})

		let sql = null
		if (literals.length === 1) {
			sql = `${getType} = ${literals[0]}`
		} else {
			sql = `${getType} IN (${literals.join(', ')})`
		}

		return new SqlFilter(sql)
	}

	static arrayContains (query, filter, alias) {
		const unnest = query.isProcessingJsonProperty ? 'jsonb_array_elements' : 'unnest'

		return new SqlFilter(`EXISTS (
	SELECT 1
	FROM ${unnest}(${query.pathToSqlField()}) AS ${pgFormat.ident(alias)}
	WHERE ${filter.toSql()}
)`)
	}

	static matchesPattern (query, pattern, flags = {}) {
		const field = query.pathToSqlField({
			asText: true
		})
		const operator = flags.ignoreCase ? '~*' : '~'

		return new SqlFilter(`(${field})::text ${operator} ${pgFormat.literal(pattern)}`)
	}

	static isMultipleOf (query, multiple) {
		return new SqlFilter(`(${query.pathToSqlField()})::numeric % ${multiple} = 0`)
	}

	static stringLengthIs (query, op, value) {
		const field = query.pathToSqlField({
			asText: true
		})

		return new SqlFilter(`char_length((${field})::text) ${op} ${value}`)
	}

	static arrayLengthIs (query, op, value) {
		const cardinality = query.isProcessingJsonProperty ? 'jsonb_array_length' : 'cardinality'

		return new SqlFilter(`${cardinality}(${query.pathToSqlField()}) ${op} ${value}`)
	}

	static propertyCountIs (query, op, value) {
		return new SqlFilter(`cardinality(array(SELECT jsonb_object_keys(${query.pathToSqlField()}))) ${op} ${value}`)
	}

	static jsonPropertyExists (query) {
		const property = query.path.pop()
		const sql = `${query.pathToSqlField()} ? ${pgFormat.literal(property)}`
		query.path.push(property)

		return new SqlFilter(sql)
	}

	static materialConditional (condition, implicated) {
		return (new SqlFilter(condition.toSql())).negate().or(implicated)
	}

	static maybeJsonLiteral (query, value) {
		const literal = query.isProcessingJsonProperty ? JSON.stringify(value) : value

		return pgFormat.literal(literal)
	}

	/**
	 * Construct a new `SQL` filter with the given SQL test. You probably want
	 * to use one of the static convenience methods.
	 *
	 * @param {String|Boolean} test - SQL to initialize this filter with.
	 */
	constructor (test) {
		// One of: `AND`, `OR`
		this.op = AND

		// A simple array of strings that joined form a valid SQL filter
		this.expr = [ test ]
	}

	negate () {
		this.expr.unshift('NOT (')
		this.expr.push(')')

		return this
	}

	and (other) {
		this.applyBinaryOperator(AND, other)

		return this
	}

	or (other) {
		this.applyBinaryOperator(OR, other)

		return this
	}

	applyBinaryOperator (op, other) {
		if (this.tryConstantFolding(op, other)) {
			return
		}

		if (this.op !== op && this.expr.length > 1) {
			this.expr.unshift('(')
			this.expr.push(')')
		}

		this.op = op
		this.expr.push(`\n${op}\n`)

		if (other.op === op || other.expr.length === 1) {
			this.expr.push(...other.expr)
		} else {
			this.expr.push('(')
			this.expr.push(...other.expr)
			this.expr.push(')')
		}
	}

	// If applicable, fold constants to simplify the resulting SQL
	tryConstantFolding (op, other) {
		if (this.expr.length === 1 && _.isBoolean(this.expr[0])) {
			this.op = other.op
			this.expr = boolConstFold[op][this.expr[0]](other.expr)

			return true
		} else if (other.expr.length === 1 && _.isBoolean(other.expr[0])) {
			this.expr = boolConstFold[op][other.expr[0]](this.expr)

			return true
		}

		return false
	}

	makeUnsatisfiable () {
		this.op = AND
		this.expr = [ false ]

		return this
	}

	toSql () {
		return this.expr.join('')
	}
}
