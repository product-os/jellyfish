/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgFormat = require('pg-format')
const assert = require('../../../../assert')
const ArrayContainsFilter = require('./array-contains-filter')
const ArrayLengthFilter = require('./array-length-filter')
const EqualsFilter = require('./equals-filter')
const ExpressionFilter = require('./expression-filter')
const FullTextSearchFilter = require('./full-text-search-filter')
const IsNullFilter = require('./is-null-filter')
const IsOfJsonTypesFilter = require('./is-of-json-types-filter')
const JsonMapPropertyCountFilter = require('./json-map-property-count-filter')
const MatchesRegexFilter = require('./matches-regex-filter')
const MultipleOfFilter = require('./multiple-of-filter')
const NotFilter = require('./not-filter')
const SqlFragmentBuilder = require('./builder/fragment')
const StringLengthFilter = require('./string-length-filter')
const ValueIsFilter = require('./value-is-filter')
const REGEXES = require('./regexes')
const {
	InvalidSchema
} = require('./errors')

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

			field.unshift('(')
			field.push(')::text')
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
	 *        - parentLinkTypes: an array of link types denoting `$$links`
	 *          nesting
	 */
	constructor (tableOrParent, options = {}) {
		// Set of properties that must exist
		this.required = []

		// Query filter. Defaults to `true` as an empty schema matches anything
		this.filter = new ExpressionFilter(true)

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
		if (!('parentLinkTypes' in this.options)) {
			this.options.parentLinkTypes = []
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
		const filter = new MatchesRegexFilter(this, regex)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	finalize () {
		const noPropertiesFilter = this.propertiesFilter === null
		if (this.required.length === 0 && noPropertiesFilter) {
			return
		}

		const filter = noPropertiesFilter ? new ExpressionFilter(true) : this.propertiesFilter
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
				linkType, linkSchema, [ '$$links', linkType ])
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
		const filter = new ExpressionFilter(false)
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
		this.filter.and(new EqualsFilter(this, [ value ]))
	}

	containsVisitor (schema) {
		if (this.tryJsonContainsOptimization(schema)) {
			return
		}

		const alias = 'items'
		const containsQuery = this.buildQueryFromCorrelatedSchema(alias, schema, [ 'contains' ])

		assert.INTERNAL(null, _.isEmpty(containsQuery.links), InvalidSchema,
			'\'$$links\' is not supported inside a \'contains\' declaration')

		const filter = new ArrayContainsFilter(this, containsQuery.filter, alias)
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
				filter = new ValueIsFilter(this, '@>', value)
			} else if (keyCount === 2 && 'type' in schema) {
				const type = schema.type
				// eslint-disable-next-line valid-typeof
				if (typeof value === type || (type === 'integer' && _.isNumber(value))) {
					filter = new ValueIsFilter(this, '@>', value)
				} else {
					filter = new ExpressionFilter(false)
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
		this.filter.and(new EqualsFilter(this, values))
	}

	exclusiveMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMaximum')}' must be a number`
		})

		const filter = new ValueIsFilter(this, '<', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	exclusiveMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMinimum')}' must be a number`
		})

		const filter = new ValueIsFilter(this, '>', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	formatMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMaximum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMaximum`
		})

		const filter = new ValueIsFilter(this, '<=', limit, this.formatToPostgresType('formatMaximum'))
		this.filter.and(this.ifTypeThen('string', filter))
	}

	formatMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMinimum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMinimum`
		})

		const filter = new ValueIsFilter(this, '>=', limit, this.formatToPostgresType('formatMinimum'))
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

		const filter = new ArrayContainsFilter(this, itemsQuery.filter.negate(), alias)
		this.filter.and(this.ifTypeThen('array', new NotFilter(filter)))
	}

	tupleMustMatch (schemas) {
		const filter = new ExpressionFilter(true)
		if (!this.additionalProperties) {
			filter.and(new ArrayLengthFilter(this, '<=', schemas.length))
		}

		for (const [ idx, schema ] of schemas.entries()) {
			this.path.push(idx)
			const elementQuery = this.buildQueryFromSubSchema(schema, [ 'items', idx ])
			this.path.pop()

			assert.INTERNAL(null, _.isEmpty(elementQuery.links), InvalidSchema,
				'\'$$links\' is not supported inside an \'items\' declaration')

			const lengthFilter = new ArrayLengthFilter(this, '>', idx)
				.intoExpression()
				.implies(elementQuery.filter)
			filter.and(lengthFilter)
		}
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maximum')}' must be a number`
		})

		const filter = new ValueIsFilter(this, '<=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	maxLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxLength')}' must be a number`
		})

		const filter = new StringLengthFilter(this, '<=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	maxItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxItems')}' must be a number`
		})

		const filter = new ArrayLengthFilter(this, '<=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maxPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxProperties')}' must be a number`
		})

		const filter = new JsonMapPropertyCountFilter(this, '<=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	minimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minimum')}' must be a number`
		})

		const filter = new ValueIsFilter(this, '>=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	minLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minLength')}' must be a number`
		})

		const filter = new StringLengthFilter(this, '>=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	minItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minItems')}' must be a number`
		})

		const filter = new ArrayLengthFilter(this, '>=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	minPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minProperties')}' must be a number`
		})

		const filter = new JsonMapPropertyCountFilter(this, '>=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	multipleOfVisitor (multiple) {
		assert.INTERNAL(null, _.isNumber(multiple), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('multipleOf')}' must be a number`
		})

		const filter = new MultipleOfFilter(this, multiple)
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

		const filter = new MatchesRegexFilter(this, pattern)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	propertiesVisitor (propertiesMap) {
		assert.INTERNAL(null, _.isPlainObject(propertiesMap), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('properties')}' must be a map`
		})

		this.propertiesFilter = new ExpressionFilter(true)
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
				let existsFilter = this.existsFilter()
				if (existsFilter !== null) {
					existsFilter = existsFilter.intoExpression()
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
			filter = new MatchesRegexFilter(this, value)
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

			filter = new MatchesRegexFilter(this, value.pattern, flags)
		}

		this.filter.and(this.ifTypeThen('string', filter))
	}

	fullTextSearchVisitor (value) {
		assert.INTERNAL(null, _.isPlainObject(value), Error, () => {
			return `value for '${this.formatJsonPath('fullTextSearch')}' must be a map`
		})
		assert.INTERNAL(null, _.isString(value.term), Error, () => {
			return `value for '${this.formatJsonPath('fullTextSearch')}.term' must be a string`
		})

		this.filter.and(this.ifTypeThen('string', new FullTextSearchFilter(this, value.term)))
		this.filter.and(this.ifTypeThen('array', new FullTextSearchFilter(this, value.term, true)))
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
			return new ExpressionFilter(true)
		}

		return typeFilter.intoExpression().implies(filter)
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
			const filter = new ExpressionFilter(true)
			filter.and(new IsOfJsonTypesFilter(this, [ 'number' ]))
			filter.and(new MultipleOfFilter(this, 1))

			const nonIntegerTypes = _.without(validTypes, 'integer')
			if (nonIntegerTypes.length > 0) {
				filter.or(new IsOfJsonTypesFilter(this, nonIntegerTypes))
			}

			return filter
		}

		return new IsOfJsonTypesFilter(this, validTypes)
	}

	existsFilter () {
		if (this.isProcessingColumn && !_.get(CARD_FIELDS, [ this.getPathTip(), 'nullable' ])) {
			return null
		}

		return new IsNullFilter(this, false)
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
	buildQueryFromUncorrelatedSchema (linkType, schema, suffix) {
		this.options.parentJsonPath.push(...suffix)
		this.options.parentLinkTypes.push(linkType)

		const options = Object.assign({
			parentJsonPath: _.concat(this.options.parentJsonPath, _.castArray(suffix)),
			parentLinkTypes: this.options.parentLinkTypes
		}, _.get(this.options, [ 'links', linkType ]))

		const table = pgFormat.ident(`join.${this.options.parentLinkTypes.join('.')}`)
		const query = SqlQuery.fromSchema(table, schema, options)

		this.options.parentLinkTypes.pop()
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

		const filterBuilder = new SqlFragmentBuilder()
		this.filter.toSqlInto(filterBuilder)
		const filter = filterBuilder.build()
		const {
			orderBy,
			orderByField
		} = this.getSqlOrderBy()

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

		const linkEdges = []
		const joins = []
		const laterals = []
		let idx = 0
		for (const [ linkType, linked ] of Object.entries(this.links)) {
			const fragments = linked.toSqlJoin(idx, [ linkType ], this.table, this.table)
			columns.push(fragments.column)
			linkEdges.push(...fragments.linkEdges)
			joins.push(...fragments.joins)
			laterals.push(fragments.lateral)
			idx = fragments.nextIdx
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
${linkEdges.join(',\n')}
                    ]
                )::cardAndLinkEdges
            ) AS arr
            FROM ${this.table}
${joins.join('\n')}
            WHERE ${filter}
            GROUP BY ${orderByField}${orderBy}${innerLimit}
        )
        SELECT
            unwrapped.cardId,
            array_agg(unwrapped.edges) AS linkEdges
        FROM (
            SELECT (unnest(fence.arr)).*
            FROM fence
        ) AS unwrapped
        GROUP BY unwrapped.cardId
    ) AS main,
${laterals.join(',\n')}
WHERE ${this.table}.id = main.cardId${orderBy}${skip}${limit}`
	}

	toSqlJoin (idx, linkTypeStack, cardsTable, parentTable) {
		const linkName = pgFormat.literal(linkTypeStack[linkTypeStack.length - 1])
		const stack = linkTypeStack.join('.')
		const linksAlias = pgFormat.ident(`links.${stack}`)
		const joinAlias = pgFormat.ident(`join.${stack}`)
		const lateralAlias = pgFormat.ident(`linked.${linkTypeStack[linkTypeStack.length - 1]}`)

		const column = `${lateralAlias}.linkedCards AS ${linksAlias}`
		const linkEdges = [ `row(${parentTable}.id, ${idx}, ${joinAlias}.id)::linkEdge` ]

		const joinFilterBuilder = new SqlFragmentBuilder()
		this.filter.toSqlInto(joinFilterBuilder)
		const joinFilter = joinFilterBuilder.build()
		const joins = [
			`JOIN links AS ${linksAlias}
ON
	(${linksAlias}.name = ${linkName} AND ${linksAlias}.fromId = ${parentTable}.id) OR
	(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.toId = ${parentTable}.id)
JOIN ${cardsTable} AS ${joinAlias}
ON
	(
		(${linksAlias}.name = ${linkName} AND ${linksAlias}.toId = ${joinAlias}.id) OR
		(${linksAlias}.inversename = ${linkName} AND ${linksAlias}.fromId = ${joinAlias}.id)
	)
	AND
	(${joinFilter})`
		]

		let nextIdx = idx + 1
		const linkedData = {
			links: [],
			joins: []
		}
		if (!_.isEmpty(this.links)) {
			for (const [ linkedLinkType, linked ] of Object.entries(this.links)) {
				linkTypeStack.push(linkedLinkType)
				const fragments = linked.toSqlJoin(nextIdx, linkTypeStack, cardsTable, joinAlias)
				linkTypeStack.pop()

				linkEdges.push(...fragments.linkEdges)
				joins.push(...fragments.joins)

				nextIdx = fragments.nextIdx
				const linkedAlias = pgFormat.literal(`links.${linkedLinkType}`)
				linkedData.links.push(`${linkedAlias}, ${fragments.lateralAlias}.linkedCards`)
				linkedData.joins.push(`JOIN ${fragments.lateral}
ON ${fragments.lateralAlias}.source = linked.id`)
			}
		}

		let linkedLinks = ''
		let linkedJoins = ''
		if (linkedData.links.length > 0) {
			linkedLinks = ` || jsonb_build_object(${linkedData.links.join(', ')})`
			linkedJoins = `\n${linkedData.joins.join('\n')}`
		}

		let windowFilter = ''
		if ('skip' in this.options || 'limit' in this.options) {
			const filter = []
			let lowestSeq = 1
			if ('skip' in this.options) {
				lowestSeq = this.options.skip + 1
				filter.push(`edges.seq >= ${lowestSeq}`)
			}
			if ('limit' in this.options) {
				const highestSeq = lowestSeq + this.options.limit - 1
				filter.push(`edges.seq <= ${highestSeq}`)
			}

			windowFilter = ` AND ${filter.join(' AND ')}`
		}

		const {
			orderBy
		} = this.getSqlOrderBy('linked')

		const lateral = `LATERAL (
	SELECT
		edges.source,
		array_agg(to_jsonb(linked)${linkedLinks}${orderBy}) AS linkedCards
	FROM (
		SELECT
		    row_number() OVER (PARTITION BY edges.source${orderBy}) AS seq,
		    edges.source,
		    edges.sink
		FROM unnest(main.linkEdges) AS edges
		JOIN ${cardsTable} AS linked
		ON linked.id = edges.sink
		WHERE edges.idx = ${idx}
	) AS edges
	JOIN ${cardsTable} AS linked
	ON linked.id = edges.sink${windowFilter}${linkedJoins}
	GROUP BY edges.source
) AS ${lateralAlias}`

		return {
			column,
			linkEdges,
			joins,
			lateral,
			lateralAlias,
			nextIdx
		}
	}

	getSqlOrderBy (tableOverride) {
		let table = this.table
		if (tableOverride) {
			table = tableOverride
		}

		let orderBy = ''
		let orderByField = `${table}.id`
		if (this.options.sortBy) {
			const path = _.clone(_.castArray(this.options.sortBy))
			const dir = this.options.sortDir === 'desc' ? 'DESC' : 'ASC'
			if (path.length === 1 && path[0] === 'version') {
				const versionComponents = [ 'version_major', 'version_minor', 'version_patch' ]
				orderByField = versionComponents.map((component) => {
					return `${table}.${component}`
				}).join(', ')
				const contents = versionComponents.map((component) => {
					return `${table}.${component} ${dir} NULLS LAST`
				}).join(', ')
				orderBy = `\nORDER BY ${contents}`
			} else {
				path.unshift(table)
				orderByField = SqlQuery.toSqlField(path)
				orderBy = `\nORDER BY ${orderByField} ${dir}`
			}
		}

		return {
			orderBy,
			orderByField
		}
	}
}

module.exports = (table, schema, options = {}) => {
	return SqlQuery.fromSchema(table, schema, options).toSqlSelect()
}
