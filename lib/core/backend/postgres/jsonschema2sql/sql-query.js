/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('@balena/jellyfish-assert')
const ArrayContainsFilter = require('./array-contains-filter')
const ArrayLengthFilter = require('./array-length-filter')
const EqualsFilter = require('./equals-filter')
const ExpressionFilter = require('./expression-filter')
const FullTextSearchFilter = require('./full-text-search-filter')
const IsNullFilter = require('./is-null-filter')
const IsOfJsonTypesFilter = require('./is-of-json-types-filter')
const JsonMapPropertyCountFilter = require('./json-map-property-count-filter')
const LinkFilter = require('./link-filter')
const LiteralSql = require('./literal-sql')
const MatchesRegexFilter = require('./matches-regex-filter')
const MultipleOfFilter = require('./multiple-of-filter')
const NotFilter = require('./not-filter')
const SelectMap = require('./select-map')
const SqlCteBuilder = require('./cte-builder')
const SqlFragmentBuilder = require('./fragment-builder')
const SqlPath = require('./sql-path')
const SqlSelectBuilder = require('./select-builder')
const StringLengthFilter = require('./string-length-filter')
const ValueIsFilter = require('./value-is-filter')
const REGEXES = require('./regexes')
const {
	InvalidSchema
} = require('./errors')

const FENCE_REWRAP = new LiteralSql(`
	SELECT
		unaggregated.cardId,
		array(
			SELECT row(
				edges.source,
				edges.sink,
				array_agg(edges.idx)
			)::polyLinkEdge
			FROM unnest(unaggregated.edges) AS edges
			GROUP BY edges.source, edges.sink
		) AS linkEdges
	FROM (
		SELECT
			unwrapped.cardId,
			array_agg(unwrapped.edges) AS edges
		FROM (
			SELECT (unnest(fence.arr)).*
			FROM fence
		) AS unwrapped
		GROUP BY unwrapped.cardId
	) AS unaggregated
`)

// Columns of the `cards` table
// TODO: probably worth taking this as an argument and remove the implicit
// assumptions on the table structure from the `SqlQuery` and `SqlPath` classes
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

const pathsForOrderBy = (table, sortBy) => {
	const arrSortBy = _.castArray(sortBy)
	if (arrSortBy.length === 1 && arrSortBy[0] === 'version') {
		return [
			new LiteralSql(`${table}.version_major`),
			new LiteralSql(`${table}.version_minor`),
			new LiteralSql(`${table}.version_patch`)
		]
	}

	return [ SqlPath.fromArray(arrSortBy) ]
}

const isDescendingSort = (dir) => {
	return dir === 'desc'
}

const sortOrder = (dir) => {
	return isDescendingSort(dir) ? 'DESC' : 'ASC'
}

const pushLinkedJoins = (linked, innerSelect, parentTable, cardsTable) => {
	const linksFilter = new LiteralSql(`
		(
			${linked.linksAlias}.name = ${linked.linkName} AND
			${linked.linksAlias}.fromId = ${parentTable}.id
		) OR (
			${linked.linksAlias}.inversename = ${linked.linkName} AND
			${linked.linksAlias}.toId = ${parentTable}.id
		)
	`)
	innerSelect.pushLeftJoin('links', linksFilter, linked.linksAlias)

	const joinFilter = new LiteralSql(`(
		(
			${linked.linksAlias}.name = ${linked.linkName} AND
			${linked.linksAlias}.toId = ${linked.joinAlias}.id
		) OR (
			${linked.linksAlias}.inversename = ${linked.linkName} AND
			${linked.linksAlias}.fromId = ${linked.joinAlias}.id
		)
	) AND (
		${linked.sqlFilter}
	)`)
	innerSelect.pushLeftJoin(cardsTable, joinFilter, linked.joinAlias)
}

const pushLinkedLateral = (
	select,
	idxStart,
	idxEnd,
	nestedLaterals,
	lateralAlias,
	options,
	cardsTable,
	laterals
) => {
	const lateralJoinFilter = new ExpressionFilter(
		new LiteralSql('linked.id = orderedEdges.sink')
	)
	let lowestSeq = 1
	if ('skip' in options) {
		lowestSeq = options.skip + 1
		lateralJoinFilter.and(new LiteralSql(`orderedEdges.seq >= ${lowestSeq}`))
	}
	if ('limit' in options) {
		const highestSeq = lowestSeq + options.limit - 1
		lateralJoinFilter.and(new LiteralSql(`orderedEdges.seq <= ${highestSeq}`))
	}

	let orderBy = ''
	if (options.sortBy) {
		const formattedPaths = []
		const order = sortOrder(options.sortDir)
		for (const path of pathsForOrderBy('linked', options.sortBy)) {
			formattedPaths.push(`${path.toSql('linked')} ${order} NULLS LAST`)
		}
		orderBy = ` ORDER BY ${formattedPaths.join(', ')}`
	}

	const edgeIdxs = []
	for (let idx = idxStart; idx < idxEnd; idx += 1) {
		edgeIdxs.push(idx)
	}

	const orderedEdges = new SqlSelectBuilder()
		.pushSelect('edges.source')
		.pushSelect('edges.sink')
		.pushSelect('edges.idxs')
		.pushSelect(`row_number() OVER (PARTITION BY edges.source${orderBy})`, 'seq')
		.pushFrom('unnest(main.linkEdges)', 'edges')
		.pushLeftJoin(cardsTable, new LiteralSql('linked.id = edges.sink'), 'linked')
		.setFilter(new LiteralSql(`edges.idxs && ARRAY[${edgeIdxs.join(', ')}]`))

	// TODO: support differing views
	const edgeViews = []
	for (const idx of edgeIdxs) {
		edgeViews.push(`WHEN idxs = ${idx} THEN ${select.toSql('linked')}`)
	}

	const lateral = new SqlSelectBuilder()
		.pushSelect('orderedEdges.source')
		.pushSelect(`
			array_agg(
				row(
			        linked.id,
			        array(
			            SELECT CASE
			                ${edgeViews.join('\n')}
			            END
			            FROM unnest(orderedEdges.idxs) AS idxs
			        )
			    )
				ORDER BY orderedEdges.seq
			)`,
		'linkedCards'
		)
		.pushFrom(orderedEdges, 'orderedEdges')
		.pushLeftJoin(cardsTable, lateralJoinFilter, 'linked')
		.pushGroupBy('orderedEdges', SqlPath.fromArray([ 'source' ]))

	for (const [ nestedLateral, nestedLateralAlias ] of nestedLaterals) {
		lateral.pushInnerJoin(
			nestedLateral,
			new LiteralSql(`${nestedLateralAlias}.source = linked.id`),
			nestedLateralAlias
		)
	}

	laterals.push([ lateral, lateralAlias ])
}

const linkedToSql = (data, state) => {
	const idxStart = state.linkEdges.length
	const nestedLaterals = []
	for (
		const {
			nested,
			linked
		} of data.variants
	) {
		pushLinkedJoins(linked, state.innerSelect, data.parentTable, data.cardsTable)

		const edgeIdx = state.linkEdges.length
		const edge = `row(${data.parentTable}.id, ${edgeIdx}, ${linked.joinAlias}.id)::linkEdge`
		state.linkEdges.push(edge)

		for (const [ nestedLinkType, nestedVariants ] of Object.entries(nested || {})) {
			linkedToSql(
				{
					select: data.select.getLink(nestedLinkType),
					linkType: nestedLinkType,
					variants: nestedVariants,
					options: _.get(data.options.links, [ nestedLinkType ], {}),
					parentTable: linked.joinAlias,
					cardsTable: data.cardsTable
				},
				{
					innerSelect: state.innerSelect,
					linkEdges: state.linkEdges,
					laterals: nestedLaterals
				}
			)
		}
	}

	const lateralAlias = SelectMap.lateralAliasFor(data.linkType)
	pushLinkedLateral(
		data.select,
		idxStart,
		state.linkEdges.length,
		nestedLaterals,
		lateralAlias,
		data.options,
		data.cardsTable,
		state.laterals
	)
}

/**
 * Class encapsulating all data needed to create an SQL query from a JSON
 * schema. This class' constructor is supposed to be private. Use the static
 * method {@link SqlQuery#fromSchema} to parse a JSON schema. Call {@link
 * SqlQuery#toSqlSelect} to generate an SQL query for the parsed JSON schema.
 */
module.exports = class SqlQuery {
	static fromSchema (parent, select, schema, options) {
		const query = new SqlQuery(parent, select, options)

		if (schema === false) {
			query.filter.makeUnsatisfiable()
		} else if (schema !== true) {
			// Some keywords must be processed before the rest, for validation,
			// correctness, or optimization
			if ('additionalProperties' in schema) {
				query.setAdditionalProperties(schema.additionalProperties)
			}
			if ('type' in schema) {
				query.setType(schema.type)
			}
			if ('required' in schema) {
				query.setRequired(schema.required)
			}
			if ('format' in schema) {
				query.setFormat(schema.format)
			}

			for (const [ key, value ] of Object.entries(schema)) {
				query.visit(key, value)
			}
		}

		query.finalize()

		return query
	}

	/**
	 * Create a new, empty SqlQuery. {@link SqlQuery#fromSchema} should be
	 * used instead of this constructor.
	 *
	 * @param {null|SqlQuery} parent - The parent SqlQuery if we're parsing a
	 *        sub schema. Optional.
	 * @param {SelectMap} select - The properties to be selected.
	 * @param {Object} options - An optional map with taking anything accepted
	 *        by {@link SqlQuery#fromSchema}, plus the following (for internal
	 *        use only):
	 *        - parentJsonPath: an array denoting the current path in the JSON
	 *          schema. Used to produce useful error messages when nesting
	 *          SqlQuery instances.
	 *        - parentPath: an instance of `SqlPath` denoting the current SQL
	 *          field path. This is used when creating a child SqlQuery that
	 *          refers to a different table. See {@link
	 *          SqlQuery#buildQueryFromCorrelatedSchema}.
	 *        - extraFilter: a string that is used as the initial value for
	 *          `this.filter`. Useful for constraints with placeholders.
	 */
	constructor (parent, select = {}, options = {}) {
		// Set of properties that must exist
		this.required = []

		// Query filter
		if ('extraFilter' in options) {
			this.filter = new ExpressionFilter(new LiteralSql(options.extraFilter))
			Reflect.deleteProperty(options, 'extraFilter')
		} else {
			// Defaults to `true` as an empty schema matches anything
			this.filter = new ExpressionFilter(true)
		}

		// True if, and only if `this.filter` implies that the property that
		// this object represents must exist. This is used to elide needless
		// `NOT NULL` checks with the `required`/`properties` keywords
		this.filterImpliesExists = false

		// Filter for the `properties` keyword. We need to keep this separate
		// until `finalize()` is called to apply some optimizations
		this.propertiesFilter = null

		// Format, as specified by the `format` keyword
		this.format = null

		// See the constructor's docs
		this.select = select
		this.options = options
		if (!('parentJsonPath' in this.options)) {
			this.options.parentJsonPath = []
		}

		if (parent === null) {
			// SQL field path that is currently being processed. This may refer
			// to columns or JSONB properties
			this.path = new SqlPath(this.options.parentPath)
		} else {
			this.path = parent.path
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
		if (this.path.isProcessingTable) {
			this.types = [ 'object' ]
		} else if (this.path.isProcessingColumn && !this.path.isProcessingJsonProperty) {
			const columnType = _.get(CARD_FIELDS, [ this.path.getLast(), 'type' ])
			if (columnType) {
				this.types = [ columnType ]
			}
		} else if (this.path.isProcessingSubColumn) {
			const itemsType = _.get(CARD_FIELDS, [ this.path.getSecondToLast(), 'items' ])
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

		this.select.setAdditionalProperties(schema)
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

		// We clone here because other methods may modify `this.required`
		this.required = _.clone(required)
		for (const name of required) {
			this.select.see(name)
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
		const filter = new MatchesRegexFilter(this.path, regex)
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
			this.path.setLast(required)
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
		assert.INTERNAL(null, _.isPlainObject(linkMap), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('$$links')}' must be a map`
		})

		for (const [ linkType, linkSchema ] of Object.entries(linkMap)) {
			const linkQuery = this.buildQueryFromLinkedSchema(
				linkType,
				linkSchema,
				[ '$$links', linkType ]
			)
			this.filter.and(new LinkFilter(linkType, linkQuery.filter))
		}
	}

	allOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('allOf')}' must be an array`
		})

		for (const [ idx, branchSchema ] of branches.entries()) {
			const branchQuery = this.buildQueryFromSubSchema(
				branchSchema,
				[ 'allOf', idx ]
			)

			this.filter.and(branchQuery.filter)
			this.filterImpliesExists = this.filterImpliesExists || branchQuery.filterImpliesExists
		}
	}

	anyOfVisitor (branches) {
		assert.INTERNAL(null, Array.isArray(branches), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('anyOf')}' must be an array`
		})

		let allFilterImpliesExists = true
		const filter = new ExpressionFilter(false)
		for (const [ idx, branchSchema ] of branches.entries()) {
			const selectBranch = this.select.newBranch()
			const branchQuery = this.buildQueryFromSubSchema(
				branchSchema,
				[ 'anyOf', idx ],
				selectBranch
			)
			selectBranch.setFilter(branchQuery.filter)

			filter.or(branchQuery.filter)
			allFilterImpliesExists = allFilterImpliesExists && branchQuery.filterImpliesExists
		}

		this.filterImpliesExists = this.filterImpliesExists || allFilterImpliesExists
		this.filter.and(filter)
	}

	constVisitor (value) {
		this.filterImpliesExists = true
		this.filter.and(new EqualsFilter(this.path, [ value ]))
	}

	containsVisitor (schema) {
		if (this.tryJsonContainsOptimization(schema)) {
			return
		}

		const containsQuery = this.buildQueryFromCorrelatedSchema(schema, [ 'contains' ])
		const filter = new ArrayContainsFilter(this.path, containsQuery.filter)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	// If applicable, use the `@>` operator as an optimization for schemas
	// containing only the `const` keyword (and maybe a compatible `type`)
	tryJsonContainsOptimization (schema) {
		let filter = null
		if (_.isPlainObject(schema) && 'const' in schema && this.path.isProcessingJsonProperty) {
			const value = schema.const
			const keyCount = Object.keys(schema).length
			if (keyCount === 1) {
				filter = new ValueIsFilter(this.path, '@>', value)
			} else if (keyCount === 2 && 'type' in schema) {
				const type = schema.type
				// eslint-disable-next-line valid-typeof
				if (typeof value === type || (type === 'integer' && _.isNumber(value))) {
					filter = new ValueIsFilter(this.path, '@>', value)
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
		assert.INTERNAL(null, Array.isArray(values) && values.length > 0, InvalidSchema, () => {
			return `value for '${this.formatJsonPath('enum')}' must be a non-empty array`
		})

		this.filterImpliesExists = true
		this.filter.and(new EqualsFilter(this.path, values))
	}

	exclusiveMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMaximum')}' must be a number`
		})

		const filter = new ValueIsFilter(this.path, '<', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	exclusiveMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('exclusiveMinimum')}' must be a number`
		})

		const filter = new ValueIsFilter(this.path, '>', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	formatMaximumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMaximum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMaximum`
		})

		const filter = new ValueIsFilter(this.path, '<=', limit, this.formatToPostgresType('formatMaximum'))
		this.filter.and(this.ifTypeThen('string', filter))
	}

	formatMinimumVisitor (limit) {
		assert.INTERNAL(null, _.isString(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('formatMinimum')}' must be a string`
		})

		assert.INTERNAL(null, this.format !== null, InvalidSchema, () => {
			return `missing '${this.formatJsonPath('format')}' for formatMinimum`
		})

		const filter = new ValueIsFilter(this.path, '>=', limit, this.formatToPostgresType('formatMinimum'))
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
		const itemsQuery = this.buildQueryFromCorrelatedSchema(schema, [ 'items' ])
		const filter = new ArrayContainsFilter(this.path, itemsQuery.filter.negate())
		this.filter.and(this.ifTypeThen('array', new NotFilter(filter)))
	}

	tupleMustMatch (schemas) {
		const filter = new ExpressionFilter(true)
		if (!this.select.getAdditionalProperties()) {
			filter.and(new ArrayLengthFilter(this.path, '<=', schemas.length))
		}

		for (const [ idx, schema ] of schemas.entries()) {
			this.path.push(idx)
			const elementQuery = this.buildQueryFromSubSchema(schema, [ 'items', idx ])
			this.path.pop()

			const lengthFilter = new ArrayLengthFilter(this.path, '>', idx)
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

		const filter = new ValueIsFilter(this.path, '<=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	maxLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxLength')}' must be a number`
		})

		const filter = new StringLengthFilter(this.path, '<=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	maxItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxItems')}' must be a number`
		})

		const filter = new ArrayLengthFilter(this.path, '<=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	maxPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('maxProperties')}' must be a number`
		})

		const filter = new JsonMapPropertyCountFilter(this.path, '<=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	minimumVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minimum')}' must be a number`
		})

		const filter = new ValueIsFilter(this.path, '>=', limit)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	minLengthVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minLength')}' must be a number`
		})

		const filter = new StringLengthFilter(this.path, '>=', limit)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	minItemsVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minItems')}' must be a number`
		})

		const filter = new ArrayLengthFilter(this.path, '>=', limit)
		this.filter.and(this.ifTypeThen('array', filter))
	}

	minPropertiesVisitor (limit) {
		assert.INTERNAL(null, _.isNumber(limit), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('minProperties')}' must be a number`
		})

		const filter = new JsonMapPropertyCountFilter(this.path, '>=', limit)
		this.filter.and(this.ifTypeThen('object', filter))
	}

	multipleOfVisitor (multiple) {
		assert.INTERNAL(null, _.isNumber(multiple), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('multipleOf')}' must be a number`
		})

		const filter = new MultipleOfFilter(this.path, multiple)
		this.filter.and(this.ifTypeThen('number', filter))
	}

	notVisitor (schema) {
		const subQuery = this.buildQueryFromSubSchema(schema, [ 'not' ])

		this.filter.and(subQuery.filter.negate())
	}

	patternVisitor (pattern) {
		assert.INTERNAL(null, _.isString(pattern), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('pattern')}' must be a string`
		})

		const filter = new MatchesRegexFilter(this.path, pattern)
		this.filter.and(this.ifTypeThen('string', filter))
	}

	propertiesVisitor (propertiesMap) {
		assert.INTERNAL(null, _.isPlainObject(propertiesMap), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('properties')}' must be a map`
		})

		this.propertiesFilter = new ExpressionFilter(true)
		this.path.push(null)
		for (const [ propertyName, propertySchema ] of Object.entries(propertiesMap)) {
			this.path.setLast(propertyName)
			const propertyQuery = this.buildQueryFromSubSchema(
				propertySchema,
				[ 'properties', propertyName ],
				this.select.getProperty(propertyName)
			)

			const isRequired = this.required.includes(propertyName)
			if (isRequired) {
				_.pull(this.required, propertyName)
			}

			// Add a filter for the existence of a property according to
			// whether it is required or not, and whether the property filter
			// itself implies that the property exists. This is slightly
			// contrived to make sure we only add one such check
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
	}

	regexpVisitor (value) {
		const isString = _.isString(value)

		assert.INTERNAL(null, isString || _.isPlainObject(value), InvalidSchema, () => {
			return `value for '${this.formatJsonPath('regexp')}' must be a string or a map`
		})

		let filter = null
		if (isString) {
			filter = new MatchesRegexFilter(this.path, value)
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

			filter = new MatchesRegexFilter(this.path, value.pattern, flags)
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

		this.filter.and(this.ifTypeThen('string', new FullTextSearchFilter(this.path, value.term)))
		this.filter.and(this.ifTypeThen('array', new FullTextSearchFilter(this.path, value.term, true)))
	}

	ifTypeThen (type, filter) {
		if (this.types.length === 1 && type === this.types[0]) {
			// No need for a conditional since the field can only be of one
			// type. Also this effectively simplifies `x && (!x || y)` to
			// `x && y`, where `x` is the type filter. PG doesn't apply this
			// optimization
			return filter
		}

		const typeFilter = this.getIsTypesFilter([ type ])
		if (typeFilter === null) {
			return filter
		} else if (typeFilter === false) {
			// Normally the filter we return is a material conditional, which
			// has the form `!x || y` where `x` is the type filter. If we know
			// that the type filter always evaluates to false, this expression
			// simplifies to true.
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

		if (!this.path.isProcessingJsonProperty) {
			// Only JSON properties require type checks
			return null
		}

		if (validTypes.includes('integer')) {
			// JSON doesn't have the concept of integers, so this requires
			// some extra checks
			const filter = new ExpressionFilter(true)
			filter.and(new IsOfJsonTypesFilter(this.path, [ 'number' ]))
			filter.and(new MultipleOfFilter(this.path, 1))

			const nonIntegerTypes = _.without(validTypes, 'integer')
			if (nonIntegerTypes.length > 0) {
				filter.or(new IsOfJsonTypesFilter(this.path, nonIntegerTypes))
			}

			return filter
		}

		return new IsOfJsonTypesFilter(this.path, validTypes)
	}

	existsFilter () {
		if (this.path.isProcessingColumn && !_.get(CARD_FIELDS, [ this.path.getLast(), 'nullable' ])) {
			return null
		}

		return new IsNullFilter(this.path, false)
	}

	formatJsonPath (suffix) {
		return _.concat(this.options.parentJsonPath, _.castArray(suffix)).join('/')
	}

	// Subschemas are just what the name implies. They have the same context as
	// `this` and are just build as a separate object for organizational
	// purposes
	buildQueryFromSubSchema (schema, suffix, select) {
		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(this, select || this.select, schema, this.options)
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	// Correlated schemas are subschemas that are implemented as subqueries at
	// the SQL level, so the tables (or table aliases) they refer to are
	// different, but they still rely on some shared context with `this`
	buildQueryFromCorrelatedSchema (schema, suffix) {
		let parentPath = null
		if (_.isEmpty(this.options.parentPath)) {
			parentPath = this.path
		} else {
			parentPath = this.path.flattened()
		}

		this.options.parentJsonPath.push(...suffix)
		const query = SqlQuery.fromSchema(null, this.select, schema, {
			parentJsonPath: this.options.parentJsonPath,
			parentPath
		})
		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	// Linked schemas are almost completely independent schemas. They denote
	// cards that are linked to the current schema
	buildQueryFromLinkedSchema (linkType, schema, suffix) {
		this.options.parentJsonPath.push(...suffix)

		const select = this.select.getLink(linkType)
		const query = SqlQuery.fromSchema(null, select, schema, {
			parentJsonPath: this.options.parentJsonPath
		})

		for (let idx = 0; idx < suffix.length; ++idx) {
			this.options.parentJsonPath.pop()
		}

		return query
	}

	toSqlSelect (table) {
		// Set common stuff for our `SELECT`
		const select = new SqlSelectBuilder()
			.pushFrom(table)
		this.fillOrderBy(table, select)
		if (this.options.skip) {
			select.setOffset(this.options.skip)
		}
		if (this.options.limit) {
			select.setLimit(this.options.limit)
		}

		const filterBuilder = new SqlFragmentBuilder(table).extendFrom(this.filter)
		const filterContext = filterBuilder.getContext()
		const links = filterContext.getLinks()
		const hoistedFilters = filterContext.getHoistedFilters()
		const tableFilter = filterBuilder.toSql()
		let rootFilter = null
		if (hoistedFilters.length > 0) {
			rootFilter = `(${tableFilter}) AND (${hoistedFilters})`
		} else {
			rootFilter = tableFilter
		}
		rootFilter = new LiteralSql(rootFilter)

		if (_.isEmpty(links)) {
			// Queries without links are fairly simple
			select
				.pushSelect(this.select.toSql(table), 'payload')
				.setFilter(rootFilter)
		} else {
			// Queries with links are more complex for performance reasons.
			// They have two parts separated by a `MATERIALIZED` CTE. The CTE
			// serves as an optimization barrier to avoid bad query plans (at
			// least with PG 12) and to reorganize the data produced by the
			// inner `SELECT` for consumption by the outer part.

			// This inner `SELECT` only duty is to fetch the IDs of all cards
			// and all linked cards that matches the filters. The IDs are
			// organized as a list of `(<parentCard>, <linkType>, <childCard>)`
			// tuples representing graph edges, plus the root card ID so that
			// the correct structure can be reconstructed by the outer select.
			// This is because fetching anything but the primary key has the
			// potential to send PG's query planner right out of the happy
			// path.
			const innerSelect = new SqlSelectBuilder()
				.pushFrom(table)
				.setFilter(rootFilter)
			this.fillInnerOrderAndGroupBy(table, innerSelect)
			this.setInnerLimit(innerSelect)

			const linkEdges = []
			const laterals = []
			for (const [ linkType, variants ] of Object.entries(links)) {
				linkedToSql(
					{
						select: this.select.getLink(linkType),
						linkType,
						variants,
						options: _.get(this.options.links, [ linkType ], {}),
						parentTable: table,
						cardsTable: table
					},
					{
						innerSelect,
						linkEdges,
						laterals
					}
				)
			}

			innerSelect.pushSelect(`
				array_agg(
					row(
						${table}.id,
						array[
							${linkEdges.join(', ')}
						]
					)::cardAndLinkEdges
				)`,
			'arr'
			)

			// The outer `SELECT`, meanwhile, uses the IDs from the inner
			// `SELECT` to fetch the actual data and build the `links` map.
			const fence = new SqlCteBuilder(FENCE_REWRAP)
			fence.pushSubquery(innerSelect, 'fence', true)
			select
				.pushSelect(this.select.toSql(table), 'payload')
				.pushFrom(fence, 'main')
				.setFilter(new LiteralSql(`${table}.id = main.cardId`))

			for (const [ lateral, alias ] of laterals) {
				select.pushFrom(lateral, alias, true)
			}
		}

		return new SqlFragmentBuilder(table)
			.extendFrom(select)
			.toSql()
	}

	fillOrderBy (table, select) {
		if (!this.options.sortBy) {
			return
		}

		const isDescending = this.isDescendingSort()
		for (const path of pathsForOrderBy(table, this.options.sortBy)) {
			select.pushOrderBy(table, path, isDescending)
		}
	}

	fillInnerOrderAndGroupBy (table, innerSelect) {
		if (this.options.sortBy) {
			const paths = pathsForOrderBy(table, this.options.sortBy)
			const isDescending = this.isDescendingSort()
			for (const path of paths) {
				innerSelect.pushGroupBy(table, path)
				innerSelect.pushOrderBy(table, path, isDescending)
			}
		} else {
			innerSelect.pushGroupBy(table, SqlPath.fromArray([ 'id' ]))
		}
	}

	isDescendingSort () {
		return isDescendingSort(this.options.sortDir)
	}

	setInnerLimit (innerSelect) {
		if (!this.options.limit) {
			return
		}

		let limit = this.options.limit
		if (this.options.skip) {
			limit += this.options.skip
		}
		innerSelect.setLimit(limit)
	}
}
