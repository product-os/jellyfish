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
const graph = require('./graph')

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

module.exports = (table, schema, options = {}) => {
	if (options.experimental || (!_.has(options, [ 'experimental' ]) && environment.featureFlags.experimental)) {
		return graph.generateQuery(table, schema, options, getLinks, walk)
	}

	return generateQuery(table, schema, options)
}
