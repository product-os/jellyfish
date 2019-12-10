/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const assert = require('../../../../assert')

const generateMainQuery = (table, schema, options, hasLinks, walk) => {
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

const generateLinkedCardsQuery = (table, currentLink, currentQueryId, previousQueryId, queries, walk, getLinks) => {
	const linkedCardFilterClause = currentLink.schema ? `${walk(currentLink.schema, [ table ]).filter}` : 'true'

	const query = `SELECT 'outgoing', links.inversename, links.toid, ${table}.*
FROM ${table}
INNER JOIN links ON (${table}.id = links.fromid AND links.inversename = ${builder.valueToPostgres(currentLink.type)})
INNER JOIN ${previousQueryId} on (${previousQueryId}.id = links.toid)
WHERE ${linkedCardFilterClause}
UNION ALL
SELECT 'incoming', links.name, links.fromid, ${table}.*
FROM ${table}
INNER JOIN links ON (${table}.id = links.toid AND links.name = ${builder.valueToPostgres(currentLink.type)})
INNER JOIN ${previousQueryId} on (${previousQueryId}.id = links.fromid)
WHERE ${linkedCardFilterClause}`

	queries.push([ currentQueryId, query ])

	const links = getLinks(currentLink.schema)

	links.forEach((link, idx) => {
		const queryId = `${currentQueryId}_${idx}`
		generateLinkedCardsQuery(table, link, queryId, currentQueryId, queries, walk, getLinks)
	})
}

exports.generateQuery = (table, schema, options, getLinks, walk) => {
	const links = getLinks(schema)

	const mainQuery = generateMainQuery(table, schema, options, !_.isEmpty(links), walk)

	if (_.isEmpty(links)) {
		return mainQuery
	}

	const queries = [
		[ 'query_0', 'SELECT null AS "$link direction$", null AS "$link type$", null::uuid AS "$parent id$", main.* FROM main' ]
	]

	links.forEach((link, idx) => {
		const queryId = `query_1_${idx}`
		generateLinkedCardsQuery(table, link, queryId, 'query_0', queries, walk, getLinks)
	})

	let query = `WITH main AS (\n${mainQuery}\n)`

	query += queries
		.map(([ qId, q ]) => {
			return `, ${qId} AS (\n${q}\n)`
		})
		.join('\n')

	query += '\n'

	query += queries
		.map(([ qId, _q ]) => {
			return `SELECT * FROM ${qId}`
		})
		.join('\nUNION ALL\n')

	return query
}
