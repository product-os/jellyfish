/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const keywords = require('./keywords')
const assert = require('../../../../assert')
const environment = require('../../../../environment')

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

const queryv2 = {}

queryv2.generateMainQuery = (table, schema, options, hasLinks) => {
	let query = []

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

	if (schema.additionalProperties === true || hasLinks) {
		query.unshift(`${table}.*`)
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
		}

		if (!query[1].startsWith('FROM') && query[1] !== 'WHERE') {
			query[0] = `${query[0]}, `
		}
	}

	query.unshift('SELECT')

	if (options.sortBy) {
		const order = _.castArray(options.sortBy)

		const orderBy = [
			'ORDER BY',
			builder.getProperty([ table ].concat(order)),
			options.sortDir === 'desc' ? 'DESC' : 'ASC'
		].join(' ')

		query.push(orderBy)
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

queryv2.generateLinkedCardsQuery = (table, link) => {
	const linkedCardFilterClause = link.schema ? `AND ${walk(link.schema, [ table ]).filter}` : ''

	const query = `UNION ALL
SELECT 'outgoing', ${builder.valueToPostgres(link.type)}, links.fromid, ${table}.*
FROM ${table}
INNER JOIN links ON (links.toid = ${table}.id AND links.name = ${builder.valueToPostgres(link.type)})
WHERE links.fromid IN (SELECT id FROM main)
${linkedCardFilterClause}
UNION ALL
SELECT 'incoming', ${builder.valueToPostgres(link.type)}, links.toid, ${table}.*
FROM ${table}
INNER JOIN links ON (links.fromid = ${table}.id AND links.inverseName = ${builder.valueToPostgres(link.type)})
WHERE links.toid IN (SELECT id FROM main)
${linkedCardFilterClause}`

	return query
}

queryv2.generateGraphFriendlyQuery = (table, schema, options) => {
	const links = getLinks(schema)

	const mainQuery = queryv2.generateMainQuery(table, schema, options, !_.isEmpty(links))

	if (_.isEmpty(links)) {
		return mainQuery
	}

	const queryWithLinkedCards = [
		'WITH main AS (',
		mainQuery,
		')',
		'SELECT null AS "$link direction$", null AS "$link type$", main.id AS "$main id$", main.* FROM main'
	]

	links.forEach((link) => {
		queryWithLinkedCards.push(queryv2.generateLinkedCardsQuery(table, link))
	})

	return queryWithLinkedCards.join('\n')
}

const getLinks = (schema) => {
	if (!schema.$$links) {
		return null
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

const generateQuery = (table, schema, options) => {
	const links = getLinks(schema)
	assert.INTERNAL(null, !links || links.length <= 1, Error,
		'The translator only supports traversing one link type for now')

	const link = links ? links[0] : null

	let query = []

	const linkCard = link ? `link__${link.slug}` : null
	const linkedCard = link ? `linked_card__${link.slug}` : null

	if (link && link.schema) {
		const prefix = schema.additionalProperties ? ', ' : ''
		query.push(`${prefix}array_agg(to_jsonb(${linkedCard})) AS "links.${link.slug}"`)
	}

	query.push(`FROM ${table}`)

	if (link) {
		const joinType = link.schema ? 'INNER' : 'LEFT'

		query.push(...[
			`${joinType} JOIN links AS ${linkCard} ON (`,
			`  (${linkCard}.fromId = ${table}.id AND ${linkCard}.name = '${link.type}') OR`,
			`  (${linkCard}.toId = ${table}.id AND ${linkCard}.inverseName = '${link.type}')`,
			')'
		])

		if (link.schema) {
			query.push(...[
				`INNER JOIN ${table} AS ${linkedCard} ON (`,
				`  (${linkCard}.fromId != ${table}.id AND ${linkCard}.fromId = ${linkedCard}.id) OR`,
				`  (${linkCard}.toId != ${table}.id AND ${linkCard}.toId = ${linkedCard}.id)`,
				')'
			])
		}
	}

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

	if (link) {
		query.push('AND')

		if (link.schema) {
			query.push(`(${walk(link.schema, [ linkedCard ]).filter})`)
			query.push(`GROUP BY ${table}.id`)
		} else {
			query.push(`${linkCard} IS NULL`)
		}
	}

	if (schema.additionalProperties === true) {
		if (link) {
			query.unshift(...[
				`${table}.id,`,
				`${table}.slug,`,
				`${table}.type,`,
				`${table}.active,`,
				`${table}.version,`,
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
			query.unshift(`${table}.*`)
		}
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
		}

		if (!query[1].startsWith('FROM') && query[1] !== 'WHERE') {
			query[0] = `${query[0]}, `
		}
	}

	query.unshift('SELECT')

	if (options.sortBy) {
		const order = _.castArray(options.sortBy)

		const orderBy = [
			'ORDER BY',
			builder.getProperty([ table ].concat(order)),
			options.sortDir === 'desc' ? 'DESC' : 'ASC'
		].join(' ')

		query.push(orderBy)
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

module.exports = (table, schema, options = {}) => {
	if (options.experimental || environment.featureFlags.experimental) {
		return queryv2.generateGraphFriendlyQuery(table, schema, options)
	}

	return generateQuery(table, schema, options)
}
