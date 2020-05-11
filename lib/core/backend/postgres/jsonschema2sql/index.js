/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const REGEXES = require('./regexes')
const assert = require('../../../../assert')
const {
	InvalidSchema
} = require('./errors')

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

// Columns of the `cards` table
// TODO: probably worth taking this as an argument and remove the implicit
// assumptions on the table structure from the `SqlQuery` class
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

	static valueIs (query, operator, value, cast) {
		let field = null
		let literal = null
		if (cast) {
			field = query.pathToSqlField({
				asText: true
			})
			field = `(${field})::${cast}`
			literal = `(${pgFormat.literal(value)})::${cast}`
		} else {
			field = query.pathToSqlField()
			literal = SqlFilter.maybeJsonLiteral(query, value)
		}

		return new SqlFilter(`${field} ${operator} ${literal}`)
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

	implies (implicant) {
		return this.negate().or(implicant)
	}

	makeUnsatisfiable () {
		this.op = AND
		this.expr = [ false ]

		return this
	}

	isUnsatisfiable () {
		return this.expr.length === 1 && this.expr[0] === false
	}

	toSql () {
		return this.expr.join('')
	}
}

/**
 * Class encapsulating all data needed to create an SQL query from a JSON
 * schema. This class' constructor is supposed to be private. Use the static
 * method {@link SqlQuery#fromSchema} to parse a JSON schema. Call {@link
 * SqlQuery#toSqlSelect} to generate a text query for the parsed JSON schema.
 */
class SqlQuery {
	static toSqlField (path, tableIsJson = false, options = {}) {
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
		if (!tableIsJson && path.length === 2 && path[1] === 'version') {
			return SqlQuery.getVersionComputedField(path[0])
		}

		const field = [ path[0] ]
		if (path.length > 1) {
			if (tableIsJson) {
				field.push('->', pgFormat.literal(path[1]))
			} else {
				field.push('.', pgFormat.ident(path[1]))
			}
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
			} else if (tableIsJson && field.length === 1) {
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
			if ('type' in schema) {
				// We need to know the accepted types before processing to be
				// able to apply some optimizations
				query.setType(schema.type)
			}
			if ('required' in schema) {
				// We need to know all required properties before processing
				query.setRequired(schema.required)
			}
			if ('format' in schema) {
				// Visitors for `format{Maximum,Minimum}` need to know this
				// ahead of time
				query.setFormat(schema.format)
			}

			for (const [ key, value ] of Object.entries(schema)) {
				query.visit(key, value)
			}

			query.finalize()
		}

		return query
	}

	/**
	 * Create a new, empty SqlQuery. {@link SqlQuery#fromSchema} should be
	 * used instead of this constructor.
	 *
	 * @param {String|SqlQuery} tableOrParent - Either the name of the table
	 *        this SqlQuery will refer to, or the parent SqlQuery if we're
	 *        parsing a sub schema.
	 * @param {Object} options - An optional map with taking anything accepted
	 *        by {@link SqlQuery#fromSchema}, plus the following (for internal
     *        use only):
	 *        - parentJsonPath: an array denoting the current path in the JSON
	 *          schema. Used to produce useful error messages when nesting
	 *          SqlQuery instances.
	 *        - parentPath: an array denoting the current SQL field path. This
	 *          is used when creating a child SqlQuery that refers to a
	 *          different table. See {@link
	 *          SqlQuery#buildQueryFromCorrelatedSchema}.
	 *        - tableIsJson: whether the table for this SqlQuery is actually a
	 *          JSON value
	 */
	constructor (tableOrParent, options = {}) {
		// Set of properties that must exist
		this.required = []

		// SQL filter. Defaults to `true` as an empty schema matches anything
		this.filter = new SqlFilter(true)

		// `additionalProperties` value for the schema to be parsed. Defaults
		// to `true` as per the JSON schema spec
		this.additionalProperties = true

		// Map of link types (i.e. the name of the relation between different
		// cards) to the `SqlQuery` of the schema of that link type
		this.links = {}

		// True if, and only if `this.filter` implies that the property that
		// this object represents must exist. This is used to elide needless
		// `NOT NULL`/`?` checks with the `required`/`properties` keywords
		this.filterImpliesExists = false

		// Filter for keyword `properties`. We need to keep this separate until
		// `finalize()` is called to apply some optimizations
		this.propertiesFilter = null

		// Format as specified by the `format` keyword
		this.format = null

		// See the constructor's docs
		this.options = options
		if (!('parentJsonPath' in this.options)) {
			this.options.parentJsonPath = []
		}
		if (!('parentPath' in this.options)) {
			this.options.parentPath = []
		}

		if (_.isString(tableOrParent)) {
			// Set of columns we are selecting
			this.columns = new Set()

			// SQL field path that is currently being processed. This may refer
			// to columns or JSONB properties
			this.path = [ tableOrParent ]

			// Table to SELECT FROM
			this.table = tableOrParent
		} else {
			this.columns = tableOrParent.columns
			this.path = tableOrParent.path
		}

		this.isProcessingTable = false
		this.isProcessingColumn = false
		this.isProcessingSubColumn = false
		this.isProcessingJsonProperty = false
		this.updateisProcessingState()

		// See the constructor's docs
		if (!('tableIsJson' in this.options)) {
			this.options.tableIsJson = this.isProcessingJsonProperty
		}

		// Array of types this schema can be. Defaults to all accepted types
		this.types = [
			'array',
			'boolean',
			'integer',
			'null',
			'number',
			'object',
			'string'
		]

		if (this.isProcessingTable) {
			this.types = [ 'object' ]
		} else if (this.isProcessingColumn && !this.isProcessingJsonProperty) {
			const columnType = _.get(CARD_FIELDS, [ this.getPathTip(), 'type' ])
			if (columnType) {
				this.types = [ columnType ]
			}
		} else if (this.isProcessingSubColumn) {
			const itemsType = _.get(CARD_FIELDS, [ this.getPreviousPathTip(), 'items' ])
			if (itemsType) {
				this.types = [ itemsType ]
			}
		}
	}

	setAdditionalProperties (schema) {
		// TODO: technically this can be a schema too
		assert.INTERNAL(null, _.isBoolean(schema), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('additionalProperties')}' must be a boolean`
		})

		this.additionalProperties = schema
	}

	setType (value) {
		assert.INTERNAL(null, _.isString(value) || Array.isArray(value), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('type')}' must be a string or an array`
		})

		this.types = _.intersection(this.types, _.castArray(value))
		const typeFilter = this.getIsTypesFilter(this.types)
		if (typeFilter === false) {
			this.filter.makeUnsatisfiable()
		} else if (typeFilter !== null) {
			this.filterImpliesExists = true
			this.filter.and(typeFilter)
		}
	}

	setRequired (required) {
		assert.INTERNAL(null, Array.isArray(required), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('required')}' must be an array`
		})

		this.required = _.clone(required)
		if (this.isProcessingTable) {
			for (const key of required) {
				this.columns.add(key)
			}
		}
	}

	setFormat (format) {
		assert.INTERNAL(null, _.isString(format), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('format')}' must be a string`
		})

		assert.INTERNAL(null, format in REGEXES.format, InvalidSchema, () => {
			return `value for '${this.formatJsonPath('format')}' is invalid`
		})

		this.format = format
		const regex = REGEXES.format[format]
		const filter = SqlFilter.matchesPattern(this, regex)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	finalize () {
		const noPropertiesFilter = this.propertiesFilter === null
		if (this.required.length === 0 && noPropertiesFilter) {
			return
		}

		const filter = noPropertiesFilter ? new SqlFilter(true) : this.propertiesFilter
		this.path.push(null)
		for (const required of this.required) {
			this.path[this.path.length - 1] = required
			this.updateisProcessingState()
			const existsFilter = this.existsFilter()
			if (existsFilter !== null) {
				filter.and(existsFilter)
			}
		}
		this.path.pop()

		this.filter.and(this.ifTypeThen('object', filter))
	}

	visit (key, value) {
		assert.INTERNAL(null, _.isString(key), InvalidSchema, () => {
			return `key for '${this.formatJsonPath(key)}' must be a string`
		})

		const skippedKeywords = [
			'additionalProperties',
			'description',
			'examples',
			'format',
			'required',
			'title',
			'type'
		]
		if (skippedKeywords.includes(key)) {
			// Known keywords that we do not handle (at least here)
			return
		}

		const visitor = `${key}Visitor`
		assert.INTERNAL(null, visitor in this, InvalidSchema, () => {
			return `invalid key: ${this.formatJsonPath(key)}`
		})

		this[visitor](value)
	}

	$$linksVisitor (linkMap) {
		assert.INTERNAL(null, this.isProcessingTable, InvalidSchema,
			'a \'$$links\' key is only valid at the toplevel for the moment')
		assert.INTERNAL(null, _.isPlainObject(linkMap), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('$$links')}' must be a map`
		})

		for (const [ linkType, linkSchema ] of Object.entries(linkMap)) {
			assert.INTERNAL(null, _.isString(linkType), InvalidSchema, () => {
				return `key for '${this.formatJsonPath([ '$$links', linkType ])}' must be a string`
			})

			this.links[linkType] = this.buildQueryFromUncorrelatedSchema(
				pgFormat.ident(linkType), linkSchema, [ '$$links', linkType ])

			assert.INTERNAL(null, _.isEmpty(this.links[linkType].links), InvalidSchema,
				'\'$$links\' is not supported inside another \'$$links\' declaration')
		}
	}

	allOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('allOf')}' must be an array`
		})

		for (const [ idx, branchSchema ] of branches.entries()) {
			const branchQuery = this.buildQueryFromSubSchema(branchSchema, [ 'allOf', idx ])

			assert.INTERNAL(null, _.isEmpty(branchQuery.links), InvalidSchema,
				'\'$$links\' is not supported inside an \'allOf\' declaration')

			this.filterImpliesExists = this.filterImpliesExists || branchQuery.filterImpliesExists
			this.filter.and(branchQuery.filter)
		}
	}

	anyOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('anyOf')}' must be an array`
		})

		let allFilterImpliesExists = true
		const filter = new SqlFilter(false)
		for (const [ idx, branchSchema ] of branches.entries()) {
			const branchQuery = this.buildQueryFromSubSchema(branchSchema, [ 'anyOf', idx ])

			assert.INTERNAL(null, _.isEmpty(branchQuery.links), InvalidSchema,
				'\'$$links\' is not supported inside an \'anyOf\' declaration')

			allFilterImpliesExists = allFilterImpliesExists && branchQuery.filterImpliesExists
			filter.or(branchQuery.filter)
		}

		this.filterImpliesExists = this.filterImpliesExists || allFilterImpliesExists
		this.filter.and(filter)
	}

	constVisitor (value) {
		this.filterImpliesExists = true
		this.filter.and(SqlFilter.isEqual(this, [ value ]))
	}

	containsVisitor (schema) {
		if (this.tryJsonContainsOptimization(schema)) {
			return
		}

		const alias = 'items'
		const containsQuery = this.buildQueryFromCorrelatedSchema(alias, schema, [ 'contains' ])

		assert.INTERNAL(null, _.isEmpty(containsQuery.links), InvalidSchema,
			'\'$$links\' is not supported inside a \'contains\' declaration')

		const filter = SqlFilter.arrayContains(this, containsQuery.filter, alias)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	// If applicable, use the `@>` operator as an optimization for schemas
	// containing only the `const` keyword (and maybe a compatible `type`)
	tryJsonContainsOptimization (schema) {
		let filter = null
		if (_.isPlainObject(schema) && 'const' in schema && this.isProcessingJsonProperty) {
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
		assert.INTERNAL(null, Array.isArray(values), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('enum')}' must be an array`
		})

		assert.INTERNAL(null, values.length > 0, InvalidSchema, () => {
			return `value for '${this.formatJsonPath('enum')}' must not be empty`
		})

		this.filterImpliesExists = true
		this.filter.and(SqlFilter.isEqual(this, values))
	}

	exclusiveMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMaximum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '<', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	exclusiveMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMinimum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '>', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	formatMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMaximum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMaximum`
		})

		const filter = SqlFilter.valueIs(this, '<=', limit, this.formatToPostgresType('formatMaximum'))
		this.filter.and(this.ifTypeThen('string', filter))
	}

	formatMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMinimum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMinimum`
		})

		const filter = SqlFilter.valueIs(this, '>=', limit, this.formatToPostgresType('formatMinimum'))
		this.filter.and(this.ifTypeThen('string', filter))
	}

	formatToPostgresType (keyword) {
		if (this.format === 'date') {
			return 'date'
		} else if (this.format === 'time') {
			return 'time'
		} else if (this.format === 'date-time') {
			return 'timestamp'
		}

		throw new InvalidSchema(
			`value for '${this.formatJsonPath('format')}' ('${this.format}') is not valid for ${keyword}`)
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

		assert.INTERNAL(null, _.isEmpty(itemsQuery.links), InvalidSchema,
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

			assert.INTERNAL(null, _.isEmpty(elementQuery.links), InvalidSchema,
				'\'$$links\' is not supported inside an \'items\' declaration')

			filter.and(SqlFilter.arrayLengthIs(this, '>', idx).implies(elementQuery.filter))
		}
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maximum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	maxLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxLength')}' must be a number`
		})

		const filter = SqlFilter.stringLengthIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	maxItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxItems')}' must be a number`
		})

		const filter = SqlFilter.arrayLengthIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maxPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxProperties')}' must be a number`
		})

		const filter = SqlFilter.propertyCountIs(this, '<=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	minimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minimum')}' must be a number`
		})

		const filter = SqlFilter.valueIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	minLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minLength')}' must be a number`
		})

		const filter = SqlFilter.stringLengthIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	minItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minItems')}' must be a number`
		})

		const filter = SqlFilter.arrayLengthIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	minPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minProperties')}' must be a number`
		})

		const filter = SqlFilter.propertyCountIs(this, '>=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	multipleOfVisitor (multiple) {
		assert.INTERNAL(null, _.isNumber(multiple), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('multipleOf')}' must be a number`
		})

		const filter = SqlFilter.isMultipleOf(this, multiple)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	notVisitor (schema) {
		const subQuery = this.buildQueryFromSubSchema(schema, [ 'not' ])

		assert.INTERNAL(null, _.isEmpty(subQuery.links), InvalidSchema,
			'\'$$links\' is not supported inside a \'not\' declaration')

		this.filterImpliesExists = this.filterImpliesExists || subQuery.filterImpliesExists
		this.filter.and(subQuery.filter.negate())
	}

	patternVisitor (pattern) {
		assert.INTERNAL(null, _.isString(pattern), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('pattern')}' must be a string`
		})

		const filter = SqlFilter.matchesPattern(this, pattern)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	propertiesVisitor (propertiesMap) {
		assert.INTERNAL(null, _.isPlainObject(propertiesMap), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('properties')}' must be a map`
		})

		this.propertiesFilter = new SqlFilter(true)
		this.path.push(null)
		for (const [ propertyName, propertySchema ] of Object.entries(propertiesMap)) {
			this.path[this.path.length - 1] = propertyName
			this.updateisProcessingState()
			if (this.isProcessingColumn) {
				this.columns.add(propertyName)
			}

			const propertyQuery = this.buildQueryFromSubSchema(
				propertySchema, [ 'properties', propertyName ])

			assert.INTERNAL(null, _.isEmpty(propertyQuery.links), InvalidSchema,
				'\'$$links\' is not supported inside a \'properties\' declaration')

			const isRequired = this.required.includes(propertyName)
			if (isRequired) {
				_.pull(this.required, propertyName)
			}

			let filter = propertyQuery.filter
			const cantExist = filter.isUnsatisfiable()
			const ensureExists = isRequired && !propertyQuery.filterImpliesExists
			const allowNotExists = !isRequired
			if (cantExist || ensureExists || allowNotExists) {
				const existsFilter = this.existsFilter()
				if (existsFilter !== null) {
					if (cantExist) {
						if (ensureExists) {
							filter.makeUnsatisfiable()
						} else {
							filter = existsFilter.negate()
						}
					} else if (ensureExists) {
						filter.and(existsFilter)
					} else if (allowNotExists) {
						filter = existsFilter.implies(filter)
					}
				}
			}

			this.filterImpliesExists = this.filterImpliesExists || propertyQuery.filterImpliesExists
			this.propertiesFilter.and(filter)
		}
		this.path.pop()
		this.updateisProcessingState()
	}

	regexpVisitor (value) {
		const isString = _.isString(value)

		assert.INTERNAL(null, isString || _.isPlainObject(value), InvalidSchema, () => {
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
					assert.INTERNAL(null, false, InvalidSchema,
						`value for '${this.formatJsonPath([ 'regexp', 'flags' ])}' may only be set to 'i'`)
				}
			}

			filter = SqlFilter.matchesPattern(this, value.pattern, flags)
		}

		this.filter.and(this.ifTypeThen('string', filter))
	}

	ifTypeThen (type, filter) {
		if (this.types.length === 1 && type === this.types[0]) {
			// No need for a conditional since the field can only be of one
			// type. Also PG doesn't optimize `x && (!x || y)` so we have to do
			// that here
			return filter
		}

		const typeFilter = this.getIsTypesFilter([ type ])
		if (typeFilter === null) {
			return filter
		} else if (typeFilter === false) {
			return new SqlFilter(true)
		}

		return typeFilter.implies(filter)
	}

	// Returns:
	// - `null` if an explicit check isn't necessary
	// - `false` if the types are incompatible with `this.types`
	// - A filter testing for the type otherwise
	getIsTypesFilter (types) {
		const validTypes = _.intersection(types, this.types)
		if (validTypes.length === 0) {
			return false
		}

		if (!this.isProcessingJsonProperty) {
			// Only JSON properties require type checks
			return null
		}

		if (validTypes.includes('integer')) {
			// JSON doesn't have the concept of integers, so this requires
			// some extra checks
			const filter = new SqlFilter(true)
			filter.and(SqlFilter.isOfJsonTypes(this, [ 'number' ]))
			filter.and(SqlFilter.isMultipleOf(this, 1))

			const nonIntegerTypes = _.without(validTypes, 'integer')
			if (nonIntegerTypes.length > 0) {
				filter.or(SqlFilter.isOfJsonTypes(this, nonIntegerTypes))
			}

			return filter
		}

		return SqlFilter.isOfJsonTypes(this, validTypes)
	}

	existsFilter () {
		if (this.isProcessingColumn) {
			if (_.get(CARD_FIELDS, [ this.getPathTip(), 'nullable' ])) {
				return SqlFilter.isNotNull(this)
			}
		} else if (this.isProcessingJsonProperty) {
			return SqlFilter.jsonPropertyExists(this)
		}

		return null
	}

	updateisProcessingState () {
		const pathDepth = this.getPathDepth()
		this.isProcessingTable = pathDepth === 1
		this.isProcessingColumn = this.options.parentPath.length === 0 && this.path.length === 2

		if (pathDepth === 3) {
			this.isProcessingSubColumn = this.getPreviousPathTip() !== 'data'
		} else {
			this.isProcessingSubColumn = false
		}

		const isData = pathDepth === 2 && this.getPathTip() === 'data'
		const isDataProperty = pathDepth === 3 && !this.isProcessingSubColumn
		this.isProcessingJsonProperty = isData || isDataProperty || pathDepth > 3
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

	getPreviousPathTip () {
		if (this.path.length > 2) {
			return this.path[this.path.length - 2]
		} else if (this.path.length === 2) {
			if (_.isEmpty(this.options.parentPath)) {
				return this.path[this.path.length - 2]
			}
			return this.options.parentPath[this.options.parentPath.length - 1]
		}

		return this.options.parentPath[this.options.parentPath.length - 2]
	}

	pathToSqlField (options = {}) {
		return SqlQuery.toSqlField(this.path, this.options.tableIsJson, options)
	}

	formatJsonPath (suffix) {
		return _.concat(this.options.parentJsonPath, _.castArray(suffix)).join('.')
	}

	// Subschemas are just what the name implies. They have the same context as
	// `this` and are just build as a separate object for organizational
	// purposes
	buildQueryFromSubSchema (schema, suffix) {
		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(this, schema, this.options)
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	// Correlated schemas are subschemas that are implemented as subqueries at
	// the SQL level, so the tables (or table aliases) they refer to are
	// different, but they still rely on some shared context with `this`
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

	// Uncorrelated schemas are completely independent schemas. Their only link
	// with `this` is the current JSON path so that it can emit sane error
	// messages, but nothing else
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
			const path = _.clone(_.castArray(this.options.sortBy))
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

		const linkRefs = []
		const joins = []
		const laterals = []
		let idx = 0
		for (const [ linkType, linked ] of Object.entries(this.links)) {
			const fragments = linked.toSqlJoin(idx, linkType, this.table)
			columns.push(fragments.column)
			linkRefs.push(fragments.linkRef)
			joins.push(fragments.join)
			laterals.push(fragments.lateral)

			idx += 1
		}

		// We can't set `OFFSET` to `this.options.limit` in the innermost
		// query, so limit to the least amount we can afford without risking a
		// wrong result
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
${linkRefs.join(',\n')}
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

	toSqlJoin (idx, linkType, cardsTable) {
		const linkName = pgFormat.literal(linkType)
		const linksAlias = pgFormat.ident(`links.${linkType}`)

		const column = `${this.table}.linkedCards AS ${pgFormat.ident(`links.${linkType.replace(/ /g, '_')}`)}`

		const linkRef = `row(${idx}, ${this.table}.id)::linkRef`

		const join = `JOIN links AS ${linksAlias}
ON
	(${linksAlias}.name = ${linkName} AND ${linksAlias}.fromId = ${cardsTable}.id) OR
	(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.toId = ${cardsTable}.id)
JOIN ${cardsTable} AS ${this.table}
ON
	(
		(${linksAlias}.name = ${linkName} AND ${linksAlias}.toId = ${this.table}.id) OR
		(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.fromId = ${this.table}.id)
	)
	AND
	(${this.filter.toSql()})`

		const lateral = `LATERAL (
	SELECT array_agg(to_jsonb(linked)) AS linkedCards
	FROM ${cardsTable} AS linked
	WHERE linked.id IN (
		SELECT ref.id
		FROM unnest(main.linkIds) AS ref
		WHERE ref.idx = ${idx}
	)
) AS ${this.table}`

		return {
			column,
			linkRef,
			join,
			lateral
		}
	}
}

module.exports = (table, schema, options = {}) => {
	return SqlQuery.fromSchema(table, schema, options).toSqlSelect()
}
