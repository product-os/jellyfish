/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const REGEXES = require('./regexes')
const builder = require('./builder')
const keywords = require('./keywords')
const assert = require('../../../../assert')

/*
 * See https://www.postgresql.org/docs/9.6/functions-json.html for reference.
 */

// use to sort keywords in a schema obj
// when missing, default weight 0 is assumed
const schemaKeywordsWeight = {
	required: 10
}
const ensureRequiredComesBeforeProperties = ([ key1, _value1 ], [ key2, _value2 ]) => {
	return (schemaKeywordsWeight[key2] || 0) - (schemaKeywordsWeight[key1] || 0)
}

const walk = (schema, path, context, keys = new Set(), requiredPaths = new Set()) => {
	if (builder.isPrefixedProperty(path) && !builder.isRootProperty(path)) {
		keys.add(path.slice(1).join('/'))
	}

	if (!schema) {
		return {
			keys,
			filter: false
		}
	}

	const result = []

	const entries = Object.entries(schema)
		.sort(ensureRequiredComesBeforeProperties)

	for (const [ key, value ] of entries) {
		// Ignore unrecognized keywords
		if (!keywords[key]) {
			continue
		}

		const conjunct = keywords[key](
			value, path, walk, schema, context, keys, requiredPaths)
		result.push(conjunct.filter)

		if (conjunct.shortcut) {
			break
		}
	}

	return {
		keys,
		filter: builder.and(...result)
	}
}

const getLinks = (schema) => {
	if (!schema || !schema.$$links) {
		return []
	}

	const keys = Object.keys(schema.$$links)
		.map((key) => {
			return {
				type: key,
				slug: key.toLowerCase().replace(/[^a-z]/g, '_'),
				schema: schema.$$links[key]
			}
		})

	return keys
}

const generateLinkSubquery = (linkType, fromColumn, toColumn) => {
	return [
		`SELECT ${toColumn} FROM links`,
		`WHERE links.name = ${builder.valueToPostgres(linkType)} AND fromId = cards.id`,
		'UNION',
		`SELECT ${fromColumn} FROM links`,
		`WHERE links.inversename = ${builder.valueToPostgres(linkType)} AND toId = cards.id`
	]
}

const generateQuery = (table, schema, options) => {
	const links = getLinks(schema)
	let query = []

	for (const link of links) {
		query.push(...[
			', (SELECT array(',
			'SELECT to_jsonb(linked)',
			`FROM ${table} linked`,
			'WHERE (',
			'    linked.id IN (',
			...generateLinkSubquery(link.type, 'fromId', 'toId'),
			'    )'
		])
		if (link.schema) {
			query.push(`    AND (${walk(link.schema, [ 'linked' ]).filter})`)
		}
		query.push(`))) AS "links.${link.slug}"`)
	}

	query.push(`FROM ${table}`)

	if (_.isBoolean(schema)) {
		if (!schema) {
			query.push('WHERE false')
		}

		return query.join('\n')
	}

	assert.INTERNAL(null, _.isPlainObject(schema), Error,
		`The schema should be an object, received: ${schema}`)

	const expression = walk(schema, [ table ])
	const filter = [ expression.filter ]

	if (!Array.isArray(filter) || filter.length > 0) {
		filter.unshift('WHERE')
		query = query.concat(filter)
	}

	// This additional condition does not completely eliminate unrelated linked cards because
	// it only acts on link type, therefore ignoring link schema `properties`
	// eg: linked card type
	// To achieve that effect, we wrap the query with WITH and filter on the 'links.*' column
	// (see below)
	for (const link of links) {
		query.push('AND')
		if (!link.schema) {
			query.push('NOT')
		}
		query.push(...[
			'EXISTS (',
			...generateLinkSubquery(link.type, '1', '1'),
			')'
		])
	}

	if (schema.additionalProperties === true) {
		query.unshift(...[
			`${table}.id,`,
			`${table}.slug,`,
			`${table}.type,`,
			`${table}.active,`,
			`${builder.getProperty([ table, 'version' ])} AS version,`,
			`${table}.name,`,
			`${table}.tags,`,
			`${table}.markers,`,
			`${table}.created_at,`,
			`${table}.links,`,
			`${table}.requires,`,
			`${table}.capabilities,`,
			`${table}.data,`,
			`${table}.updated_at,`,
			`${table}.linked_at`
		])
	} else {
		const topLevelKeys = []
		for (const key of expression.keys.entries()) {
			const parts = key[0].split('/')

			// We don't support nested filtering here yet
			if (parts.length > 1) {
				continue
			}

			const property = [ table, `"${parts[0]}"` ]
			topLevelKeys.push(property.join('.'))
		}

		if (topLevelKeys.length !== 0) {
			query.unshift(topLevelKeys.join(',\n'))
		} else if (schema.required && schema.required.length > 0) {
			query.unshift(schema.required
				.map((key) => {
					return `${table}."${key}"`
				})
				.join(',\n'))
		} else {
			query.unshift(...[
				`${table}.id,`,
				`${table}.slug,`,
				`${table}.type,`,
				`${table}.active,`,
				`${builder.getProperty([ table, 'version' ])} AS version,`,
				`${table}.name,`,
				`${table}.tags,`,
				`${table}.markers,`,
				`${table}.created_at,`,
				`${table}.links,`,
				`${table}.requires,`,
				`${table}.capabilities,`,
				`${table}.data,`,
				`${table}.updated_at,`,
				`${table}.linked_at`
			])
		}
	}

	query.unshift('SELECT')

	if (options.sortBy) {
		const order = _.castArray(options.sortBy)

		const direction = options.sortDir === 'desc' ? 'DESC' : 'ASC'

		if (order.length === 1 && order[0] === 'version') {
			query.push([
				'ORDER BY',
				[ 'version_major', 'version_minor', 'version_patch' ].map((column) => {
					return [
						builder.getProperty([ table ].concat([ column ])),
						direction,
						'NULLS LAST'
					].join(' ')
				}).join(', ')
			].join(' '))
		} else {
			query.push([
				'ORDER BY',
				builder.getProperty([ table ].concat(order)),
				direction
			].join(' '))
		}
	}

	// We cannot enforce link existence without using a join, and we don't want to use it
	// So we wrap the query with a WITH and filter on the length of the resulting linked cards array
	if (links.length > 0) {
		query.unshift('WITH main AS MATERIALIZED (')
		query.push(...[
			')',
			'SELECT * FROM main',
			'WHERE'
		])

		const countCond = []
		for (const link of links) {
			if (link.schema) {
				countCond.push(`array_length("links.${link.slug}", 1) > 0`)
			} else {
				countCond.push(`array_length("links.${link.slug}", 1) IS NULL`)
			}
		}
		query.push(countCond.join('\nAND\n'))
	}

	if (options.skip) {
		assert.INTERNAL(null, _.isNumber(options.skip), Error,
			`options.skip should be a number, received: ${options.skip}`)
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		assert.INTERNAL(null, _.isNumber(options.limit), Error,
			`options.limit should be a number, received: ${options.limit}`)
		query.push(`LIMIT ${options.limit}`)
	}

	return query.join('\n')
}

// Some string constants so that we get errors on typos instead of silent bugs
const AND = 'AND'
const OR = 'OR'

const CARD_FIELDS = {
	id: {
		type: 'string'
	},
	version: {
		type: 'string'
	},
	slug: {
		type: 'string'
	},
	type: {
		type: 'string'
	},
	tags: {
		type: 'array',
		items: 'string'
	},
	markers: {
		type: 'array',
		items: 'string'
	},
	name: {
		nullable: true,
		type: 'string'
	},
	links: {
		type: 'object'
	},
	created_at: {
		type: 'string'
	},
	updated_at: {
		type: 'string'
	},
	active: {
		type: 'boolean'
	},
	requires: {
		type: 'array',
		items: 'object'
	},
	capabilities: {
		type: 'array',
		items: 'object'
	},
	data: {
		type: 'object'
	},
	linked_at: {
		type: 'object'
	}
}

/**
 * A class wrapping an SQL filter/condition/constraint. The main purpose of
 * this class is to abstract away individual tests (i.e. equaliy or null tests)
 * and to provide a way to combine filters using logical operators in a
 * convenient way. Parenthesis are also reduced to make debugging easier.
 */
class SqlFilter {
	static isNotNull (query) {
		return new SqlFilter(`${query.pathToSqlField()} IS NOT NULL`)
	}

	static isNull (query) {
		return new SqlFilter(`${query.pathToSqlField()} IS NULL`)
	}

	static isEqual (query, values) {
		const field = query.pathToSqlField()
		const literals = values.map((value) => {
			return SqlFilter.maybeJsonLiteral(query, value)
		})

		let sql = null
		if (literals.length === 1) {
			sql = `${field} = ${literals[0]}`
		} else {
			sql = `${field} IN (${literals.join(', ')})`
		}

		return new SqlFilter(sql)
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
		const unnest = query.isProcessingJsonProperty() ? 'jsonb_array_elements' : 'unnest'

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
		const cardinality = query.isProcessingJsonProperty() ? 'jsonb_array_length' : 'cardinality'

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
		const literal = query.isProcessingJsonProperty() ? JSON.stringify(value) : value

		return pgFormat.literal(literal)
	}

	constructor (test) {
		// One of: `AND`, `OR`
		this.op = AND

		// A simple array of strings that joined for a valid SQL filter
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
		// TODO: might be worth doing simple constant propagation as we emit a
		// lot of `true` and `false` constants

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

	makeUnsatisfiable () {
		this.op = AND
		this.expr = [ false ]

		return this
	}

	toSql () {
		return this.expr.join('')
	}
}

class SqlQuery {
	static toSqlField (path, rootIsJson = false, options = {}) {
		// TODO: in theory this fails to emit the computed field with the
		// following valid even if unusual schema:
		//
		// {
		//   properties: {
		//     version: {
		//       contains: true
		//     }
		//   }
		// }
		if (!rootIsJson && path.length === 2 && path[1] === 'version') {
			return SqlQuery.getVersionComputedField(path[0])
		}

		const field = [ path[0] ]
		if (path.length > 1) {
			const accessor = rootIsJson ? '->' : '.'
			field.push(accessor, pgFormat.ident(path[1]))
		}
		for (let selector of path.slice(2)) {
			if (!_.isNumber(selector)) {
				selector = pgFormat.literal(selector)
			}
			field.push('->', selector)
		}

		if (options.asText) {
			if (field.length > 2 && field[field.length - 2] === '->') {
				field[field.length - 2] = '->>'
			} else if (rootIsJson && field.length === 1) {
				field.push('#>>\'{}\'')
			}
		}

		return field.join('')
	}

	static getVersionComputedField (table) {
		return `CONCAT_WS('.',
COALESCE(${table}.version_major, '1')::text,
COALESCE(${table}.version_minor, '0')::text,
COALESCE(${table}.version_patch, '0')::text
)`
	}

	static fromSchema (tableOrParent, schema, options) {
		const query = new SqlQuery(tableOrParent, options)
		if (schema === false) {
			query.filter.makeUnsatisfiable()
		} else if (schema !== true) {
			if ('additionalProperties' in schema) {
				// We need to know if additional properties are accepted before
				// processing
				query.setAdditionalProperties(schema.additionalProperties)
			}
			if ('required' in schema) {
				// We need to know all required properties before processing
				query.addRequired(schema.required)
			}
			for (const [ key, value ] of Object.entries(schema)) {
				query.visit(key, value)
			}
		}

		return query
	}

	constructor (tableOrParent, options = {}) {
		this.required = new Set()
		this.filter = new SqlFilter(true)
		this.additionalProperties = true
		this.links = {}

		this.options = options
		_.defaults(this.options, {
			parentJsonPath: [],
			parentPath: []
		})

		if (_.isString(tableOrParent)) {
			this.columns = new Set()
			this.path = [ tableOrParent ]
			this.table = tableOrParent
		} else {
			this.columns = tableOrParent.columns
			this.path = tableOrParent.path
		}
	}

	addRequired (required) {
		assert.INTERNAL(null, Array.isArray(required), Error, () => {
			return `value for '${this.formatJsonPath('required')}' must be a string`
		})

		const requiredFilter = new SqlFilter(true)
		this.path.push(null)
		for (const key of required) {
			this.path[this.path.length - 1] = key
			const isProcessingColumn = this.isProcessingColumn()

			// TODO: as an optimization, this is not necessary if the field is
			// also constrained by some keywords (`const`, `enum`)
			if (isProcessingColumn) {
				if (_.get(CARD_FIELDS, [ key, 'nullable' ]) === true) {
					requiredFilter.and(SqlFilter.isNotNull(this))
				}
			} else if (this.isProcessingJsonProperty()) {
				requiredFilter.and(SqlFilter.jsonPropertyExists(this))
			}

			this.required.add(key)
			if (isProcessingColumn) {
				this.columns.add(key)
			}
		}
		this.path.pop()
		this.filter.and(this.ifTypeThen('object', requiredFilter))
	}

	setAdditionalProperties (schema) {
		// TODO: technically this can be a schema too
		assert.INTERNAL(null, _.isBoolean(schema), Error, () => {
			return `value for '${this.formatJsonPath('additionalProperties')}' must be a boolean`
		})

		this.additionalProperties = schema
	}

	visit (key, value) {
		assert.INTERNAL(null, _.isString(key), Error, () => {
			return `key for '${this.formatJsonPath(key)}' must be a string`
		})

		const skippedKeywords = [
			'additionalProperties',
			'description',
			'examples',
			'required',
			'title'
		]
		if (skippedKeywords.includes(key)) {
			// Known keywords that we do not handle (at least here)
			return
		}

		const visitor = `${key}Visitor`
		assert.INTERNAL(null, this[visitor], Error, () => {
			return `invalid key: ${this.formatJsonPath(key)}`
		})

		this[visitor](value)
	}

	$$linksVisitor (linkMap) {
		assert.INTERNAL(null, this.isProcessingTable(), Error,
			'a \'$$links\' key is only valid at the toplevel for the moment')
		assert.INTERNAL(null, _.isPlainObject(linkMap), Error, () => {
			return `value for '${this.formatJsonPath('$$links')}' must be a map`
		})

		for (const [ linkType, linkSchema ] of Object.entries(linkMap)) {
			assert.INTERNAL(null, _.isString(linkType), Error, () => {
				return `key for '${this.formatJsonPath([ '$$links', linkType ])}' must be a string`
			})

			this.links[linkType] = this.buildQueryFromUncorrelatedSchema(
				pgFormat.ident(linkType), linkSchema, [ '$$links', linkType ])

			assert.INTERNAL(null, _.isEmpty(this.links[linkType].links), Error,
				'\'$$links\' is not supported inside another \'$$links\' declaration')
		}
	}

	allOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), Error, () => {
			return `value for '${this.formatJsonPath('allOf')}' must be an array`
		})

		for (const [ idx, branchSchema ] of branches.entries()) {
			const branchQuery = this.buildQueryFromSubSchema(branchSchema, [ 'allOf', idx ])

			assert.INTERNAL(null, _.isEmpty(branchQuery.links), Error,
				'\'$$links\' is not supported inside an \'allOf\' declaration')

			this.filter.and(branchQuery.filter)
		}
	}

	anyOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), Error, () => {
			return `value for '${this.formatJsonPath('anyOf')}' must be an array`
		})

		const filter = new SqlFilter(false)
		for (const [ idx, branchSchema ] of branches.entries()) {
			const branchQuery = this.buildQueryFromSubSchema(branchSchema, [ 'anyOf', idx ])

			assert.INTERNAL(null, _.isEmpty(branchQuery.links), Error,
				'\'$$links\' is not supported inside an \'anyOf\' declaration')

			filter.or(branchQuery.filter)
		}

		this.filter.and(filter)
	}

	constVisitor (value) {
		let filter = null
		if (value === null && !this.isProcessingJsonProperty()) {
			filter = SqlFilter.isNull(this)
		} else {
			filter = SqlFilter.isEqual(this, [ value ])
		}
		this.filter.and(filter)
	}

	containsVisitor (schema) {
		if (this.tryJsonContainsOptimization(schema)) {
			return
		}

		const alias = 'items'
		const containsQuery = this.buildQueryFromCorrelatedSchema(alias, schema, [ 'contains' ])

		assert.INTERNAL(null, _.isEmpty(containsQuery.links), Error,
			'\'$$links\' is not supported inside a \'contains\' declaration')

		const filter = SqlFilter.arrayContains(this, containsQuery.filter, alias)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	// If applicable, use the `@>` operator as an optimization for schemas
	// containing only the `const` keyword (and maybe a compatible `type`)
	tryJsonContainsOptimization (schema) {
		let filter = null
		if (_.isPlainObject(schema) && 'const' in schema && this.isProcessingJsonProperty()) {
			const value = schema.const
			const keyCount = Object.keys(schema).length
			if (keyCount === 1) {
				filter = SqlFilter.valueIs(this, '@>', value)
			} else if (keyCount === 2 && 'type' in schema) {
				const type = schema.type
				// eslint-disable-next-line valid-typeof
				if (typeof value === type || (type === 'integer' && _.isNumber(value))) {
					filter = SqlFilter.valueIs(this, '@>', value)
				} else {
					filter = new SqlFilter(false)
				}
			}
		}

		if (filter !== null) {
			this.filter.and(this.ifTypeThen('array', filter))

			return true
		}

		return false
	}

	enumVisitor (values) {
		assert.INTERNAL(null, Array.isArray(values), Error, () => {
			return `value for '${this.formatJsonPath('enum')}' must be an array`
		})

		let filter = null
		if (values.includes(null) && !this.isProcessingJsonProperty()) {
			filter = SqlFilter.isNull(this)
			const nonNullValues = _.without(values, null)
			if (!_.isEmpty(nonNullValues)) {
				filter.or(SqlFilter.isEqual(this, nonNullValues))
			}
		} else {
			filter = SqlFilter.isEqual(this, values)
		}
		this.filter.and(filter)
	}

	formatVisitor (format) {
		assert.INTERNAL(null, _.isString(format), Error, () => {
			return `value for '${this.formatJsonPath('format')}' must be a string`
		})

		const regex = REGEXES.format[format]
		if (regex) {
			const filter = SqlFilter.matchesPattern(this, regex)
			this.filter.and(this.ifTypeThen('string', filter))
		} else {
			// TODO: maybe an informative error instead
			this.filter.makeUnsatisfiable()
		}
	}

	exclusiveMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('exclusiveMaximum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '<', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	exclusiveMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('exclusiveMinimum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '>', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	itemsVisitor (schema) {
		if (Array.isArray(schema)) {
			this.tupleMustMatch(schema)
		} else {
			this.arrayContentsMustMatch(schema)
		}
	}

	arrayContentsMustMatch (schema) {
		const alias = 'items'
		const itemsQuery = this.buildQueryFromCorrelatedSchema(alias, schema, [ 'items' ])

		assert.INTERNAL(null, _.isEmpty(itemsQuery.links), Error,
			'\'$$links\' is not supported inside an \'items\' declaration')

		const filter = SqlFilter.arrayContains(this, itemsQuery.filter.negate(), alias)
		this.filter.and(this.ifTypeThen('array', filter.negate()))
	}

	tupleMustMatch (schemas) {
		const filter = new SqlFilter(true)
		if (!this.additionalProperties) {
			filter.and(SqlFilter.arrayLengthIs(this, '<=', schemas.length))
		}

		for (const [ idx, schema ] of schemas.entries()) {
			this.path.push(idx)
			const elementQuery = this.buildQueryFromSubSchema(schema, [ 'items', idx ])
			this.path.pop()

			assert.INTERNAL(null, _.isEmpty(elementQuery.links), Error,
				'\'$$links\' is not supported inside an \'items\' declaration')

			filter.and(
				SqlFilter.materialConditional(
					SqlFilter.arrayLengthIs(this, '>', idx),
					elementQuery.filter
				)
			)
		}
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('maximum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	maxLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('maxLength')}' must be a number`
		})

		const filter = SqlFilter.stringLengthIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	maxItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('maxItems')}' must be a number`
		})

		const filter = SqlFilter.arrayLengthIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maxPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('maxProperties')}' must be a number`
		})

		const filter = SqlFilter.propertyCountIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	minimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('minimum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	minLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('minLength')}' must be a number`
		})

		const filter = SqlFilter.stringLengthIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	minItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('minItems')}' must be a number`
		})

		const filter = SqlFilter.arrayLengthIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	minPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), Error, () => {
			return `value for '${this.formatJsonPath('minProperties')}' must be a number`
		})

		const filter = SqlFilter.propertyCountIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	multipleOfVisitor (multiple) {
		assert.INTERNAL(null, _.isNumber(multiple), Error, () => {
			return `value for '${this.formatJsonPath('multipleOf')}' must be a number`
		})

		const filter = SqlFilter.isMultipleOf(this, multiple)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	notVisitor (schema) {
		const subQuery = this.buildQueryFromSubSchema(schema, [ 'not' ])

		assert.INTERNAL(null, _.isEmpty(subQuery.links), Error,
			'\'$$links\' is not supported inside a \'not\' declaration')

		this.filter.and(subQuery.filter.negate())
	}

	patternVisitor (pattern) {
		assert.INTERNAL(null, _.isString(pattern), Error, () => {
			return `value for '${this.formatJsonPath('pattern')}' must be a string`
		})

		const filter = SqlFilter.matchesPattern(this, pattern)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	propertiesVisitor (propertiesMap) {
		assert.INTERNAL(null, _.isPlainObject(propertiesMap), Error, () => {
			return `value for '${this.formatJsonPath('properties')}' must be a map`
		})

		this.path.push(null)
		for (const [ propertyName, propertySchema ] of Object.entries(propertiesMap)) {
			this.path[this.path.length - 1] = propertyName
			if (this.isProcessingColumn()) {
				this.columns.add(propertyName)
			}

			const propertyQuery = this.buildQueryFromSubSchema(
				propertySchema, [ 'properties', propertyName ])

			assert.INTERNAL(null, _.isEmpty(propertyQuery.links), Error,
				'\'$$links\' is not supported inside a \'properties\' declaration')

			let condition = propertyQuery.filter
			if (!this.required.has(propertyName)) {
				let existsFilter = null
				if (this.isProcessingColumn()) {
					if (_.get(CARD_FIELDS, [ propertyName, 'nullable' ])) {
						existsFilter = SqlFilter.isNotNull(this)
					}
				} else if (this.isProcessingJsonProperty()) {
					existsFilter = SqlFilter.jsonPropertyExists(this)
				}
				if (existsFilter !== null) {
					condition = SqlFilter.materialConditional(existsFilter, condition)
				}
			}
			this.filter.and(condition)
		}
		this.path.pop()
	}

	regexpVisitor (value) {
		const isString = _.isString(value)

		assert.INTERNAL(null, isString || _.isPlainObject(value), Error, () => {
			return `value for '${this.formatJsonPath('regexp')}' must be a string or a map`
		})

		let filter = null
		if (isString) {
			filter = SqlFilter.matchesPattern(this, value)
		} else {
			const flags = {}
			if (value.flags) {
				if (value.flags === 'i') {
					flags.ignoreCase = true
				} else {
					assert.INTERNAL(null, isString || _.isPlainObject(value), Error, () => {
						return `value for '${this.formatJsonPath([ 'regexp', 'flags' ])}' may only be set to 'i'`
					})
				}
			}

			filter = SqlFilter.matchesPattern(this, value.pattern, flags)
		}

		this.filter.and(this.ifTypeThen('string', filter))
	}

	typeVisitor (value) {
		assert.INTERNAL(null, Array.isArray(value) || _.isString(value), Error, () => {
			return `value for '${this.formatJsonPath('type')}' must be a string or an array`
		})

		const typeFilter = this.getIsTypesFilter(_.castArray(value))
		if (typeFilter === false) {
			this.filter.makeUnsatisfiable()
		} else if (typeFilter !== null) {
			this.filter.and(typeFilter)
		}
	}

	ifTypeThen (type, filter) {
		const typeFilter = this.getIsTypesFilter([ type ])
		if (typeFilter === null) {
			return filter
		} else if (typeFilter === false) {
			return new SqlFilter(false)
		}

		return SqlFilter.materialConditional(typeFilter, filter)
	}

	// Returns:
	// - `null` if an explicit check isn't necessary
	// - `false` if the types are incompatible with the `card` table
	// - A filter testing for the type otherwise
	// TODO: actually this needs some review/rethink
	getIsTypesFilter (types) {
		if (this.isProcessingTable()) {
			// The root type must always be 'object'
			if (types.includes('object')) {
				return null
			}
			return false
		} else if (this.isProcessingColumn()) {
			// Toplevel properties are also fixed, except for `data`'s contents
			const column = this.getPathTip()
			if (column === 'data') {
				return SqlFilter.isOfJsonTypes(this, types)
			}

			const knownField = CARD_FIELDS[column]
			if (!knownField || types.includes(knownField.type)) {
				return null
			}
			return false
		} else if (this.isProcessingSubColumn()) {
			// TODO
			return null
		} else if (types.includes('integer')) {
			// JSON doesn't have the concept of integers, so this requires
			// some extra checks
			const filter = new SqlFilter(true)
			filter.and(SqlFilter.isOfJsonTypes(this, [ 'number' ]))
			filter.and(SqlFilter.isMultipleOf(this, 1))

			const nonIntegerTypes = _.without(types, 'integer')
			if (!_.isEmpty(nonIntegerTypes)) {
				filter.or(SqlFilter.isOfJsonTypes(this, nonIntegerTypes))
			}

			return filter
		}

		return SqlFilter.isOfJsonTypes(this, types)
	}

	isProcessingTable () {
		return this.getPathDepth() === 1
	}

	isProcessingColumn () {
		return _.isEmpty(this.options.parentPath) && this.path.length === 2
	}

	isProcessingSubColumn () {
		if (this.getPathDepth() === 3) {
			let column = null
			if (this.path.length === 3) {
				column = this.path[this.path.length - 2]
			} else if (this.path.length === 2) {
				column = this.options.parentPath[this.options.parentPath.length - 1]
			} else {
				column = this.options.parentPath[this.options.parentPath.length - 2]
			}

			return column !== 'data'
		}

		return false
	}

	isProcessingJsonProperty () {
		const depth = this.getPathDepth()
		const isData = depth === 2 && this.getPathTip() === 'data'

		return isData || (depth === 3 && !this.isProcessingSubColumn()) || depth > 3
	}

	getPathDepth () {
		return this.options.parentPath.length + this.path.length
	}

	getPathTip () {
		if (this.path.length === 1 && !_.isEmpty(this.options.parentPath)) {
			return this.options.parentPath[this.options.parentPath.length - 1]
		}
		return this.path[this.path.length - 1]
	}

	pathToSqlField (options = {}) {
		const isRootJson = this.path.length === 1 && this.isProcessingJsonProperty()

		return SqlQuery.toSqlField(this.path, isRootJson, options)
	}

	formatJsonPath (suffix) {
		return _.concat(this.options.parentJsonPath, _.castArray(suffix)).join('.')
	}

	buildQueryFromSubSchema (schema, suffix) {
		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(this, schema, this.options)
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	buildQueryFromCorrelatedSchema (table, schema, suffix) {
		let parentPath = null
		if (_.isEmpty(this.options.parentPath)) {
			parentPath = this.path
		} else {
			parentPath = _.concat(this.options.parentPath, this.path.slice(1))
		}

		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(table, schema, {
			parentJsonPath: this.options.parentJsonPath,
			parentPath
		})
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	buildQueryFromUncorrelatedSchema (table, schema, suffix) {
		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(table, schema, {
			parentJsonPath: _.concat(this.options.parentJsonPath, _.castArray(suffix))
		})
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	toSqlSelect () {
		let columns = null
		if (this.additionalProperties) {
			columns = [
				`${this.table}.id`,
				`${this.table}.slug`,
				`${this.table}.type`,
				`${this.table}.active`,
				`${SqlQuery.getVersionComputedField(this.table)} AS version`,
				`${this.table}.name`,
				`${this.table}.tags`,
				`${this.table}.markers`,
				`${this.table}.created_at`,
				`${this.table}.links`,
				`${this.table}.requires`,
				`${this.table}.capabilities`,
				`${this.table}.data`,
				`${this.table}.updated_at`,
				`${this.table}.linked_at`
			]
		} else {
			columns = Array.from(this.columns.values()).map((column) => {
				if (column === 'version') {
					return `${SqlQuery.getVersionComputedField(this.table)} AS version`
				}

				return `${this.table}.${pgFormat.ident(column)}`
			})
		}

		const filter = this.filter.toSql()

		let orderBy = ''
		let orderByField = `${this.table}.id`
		if (this.options.sortBy) {
			const path = _.castArray(this.options.sortBy)
			const dir = this.options.sortDir === 'desc' ? 'DESC' : 'ASC'
			if (path.length === 1 && path[0] === 'version') {
				const versionComponents = [ 'version_major', 'version_minor', 'version_patch' ]
				orderByField = versionComponents.map((component) => {
					return `${this.table}.${component}`
				}).join(', ')
				const contents = versionComponents.map((component) => {
					return `${this.table}.${component} ${dir} NULLS LAST`
				}).join(', ')
				orderBy = `\nORDER BY ${contents}`
			} else {
				path.unshift(this.table)
				orderByField = SqlQuery.toSqlField(path)
				orderBy = `\nORDER BY ${orderByField} ${dir}`
			}
		}

		let skip = ''
		if (this.options.skip) {
			assert.INTERNAL(null, _.isNumber(this.options.skip), Error,
				`options.skip should be a number, received: ${this.options.skip}`)
			skip = `\nOFFSET ${this.options.skip}`
		}

		let limit = ''
		if (this.options.limit) {
			assert.INTERNAL(null, _.isNumber(this.options.limit), Error,
				`options.limit should be a number, received: ${this.options.limit}`)
			limit = `\nLIMIT ${this.options.limit}`
		}

		// For performance reasons, the query structures for the cases where
		// there are no links is wildly different from where there are links
		if (_.isEmpty(this.links)) {
			return `SELECT
\t${columns.join(',\n\t')}
FROM ${this.table}
WHERE ${filter}${orderBy}${skip}${limit}`
		}

		const linkTypes = Object.keys(this.links)

		const innerLinkedEntries = []
		const laterals = []
		for (const [ i, linkType ] of linkTypes.entries()) {
			const linkedTable = this.links[linkType].table
			columns.push(`${linkedTable}.linkedCards AS ${pgFormat.ident(`links.${linkType.replace(/ /g, '_')}`)}`)
			innerLinkedEntries.push(`row(${i}, ${linkedTable}.id)::linkRef`)
			laterals.push(`LATERAL (
	SELECT array_agg(to_jsonb(linked)) AS linkedCards
	FROM ${this.table} AS linked
	WHERE linked.id IN (
		SELECT ref.id
		FROM unnest(main.linkIds) AS ref
		WHERE ref.idx = ${i}
	)
) AS ${linkedTable}`)
		}

		// Inner joins (obligatory) must come before left ones (optional)
		const joins = []
		for (const [ linkType, linkQuery ] of Object.entries(this.links)) {
			// Assume all linked cards come from the same table as this query
			const linkName = pgFormat.literal(linkType)
			const linksAlias = pgFormat.ident(`linksJoin.${linkType}`)
			joins.push(`JOIN links AS ${linksAlias}
ON
\t(${linksAlias}.name = ${linkName} AND ${linksAlias}.fromId = ${this.table}.id) OR
\t(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.toId = ${this.table}.id)
JOIN ${this.table} AS ${linkQuery.table}
ON
\t(
\t\t(${linksAlias}.name = ${linkName} AND ${linksAlias}.toId = ${linkQuery.table}.id) OR
\t\t(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.fromId = ${linkQuery.table}.id)
\t) AND
\t(${linkQuery.filter.toSql()})`)
		}

		// We can't use `OFFSET` in the innermost query, so limit to the least
		// amount we can afford without risking a wrong result
		let innerLimit = 0
		if (this.options.skip) {
			innerLimit += this.options.skip
		}
		if (this.options.limit) {
			innerLimit += this.options.limit
		}
		innerLimit = (innerLimit === 0) ? '' : `\nLIMIT ${innerLimit}`

		return `SELECT
\t${columns.join(',\n\t')}
FROM
    ${this.table},
    (
        WITH fence AS MATERIALIZED (
            SELECT array_agg(
                row(
                    ${this.table}.id,
                    array[
                        ${innerLinkedEntries.join(',\n')}
                    ]
                )::cardAndLinkIds
            ) AS arr
            FROM ${this.table}
            ${joins.join('\n')}
            WHERE ${filter}
            GROUP BY ${orderByField}${orderBy}${innerLimit}
        )
        SELECT
            unwrapped.cardId,
            array_agg(unwrapped.linkIds) AS linkIds
        FROM (
            SELECT (unnest(fence.arr)).*
            FROM fence
        ) AS unwrapped
        GROUP BY unwrapped.cardId
    ) AS main,
    ${laterals.join(',\n')}
WHERE ${this.table}.id = main.cardId${orderBy}${skip}${limit}`
	}
}

module.exports = (table, schema, options = {}) => {
	if (options.useNewCompiler) {
		return SqlQuery.fromSchema(table, schema, options).toSqlSelect()
	}

	return generateQuery(table, schema, options)
}
