/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const builder = require('./builder')
const keywords = require('./keywords')

/*
 * See https://www.postgresql.org/docs/9.6/functions-json.html for reference.
 */

const walk = (schema, path, context, keys = new Set()) => {
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

	for (const [ key, value ] of Object.entries(schema)) {
		// Ignore unrecognized keywords
		if (!keywords[key]) {
			continue
		}

		const conjunct = keywords[key](
			value, path, walk, schema, context, keys)
		result.push(conjunct.filter)
	}

	return {
		keys,
		filter: builder.and(...result)
	}
}

const getLink = (schema) => {
	if (!schema.$$links) {
		return null
	}

	const keys = Object.keys(schema.$$links)
	if (keys.length !== 1) {
		throw new Error(
			'The translator only supports traversing one link type for now')
	}

	return {
		type: keys[0],
		slug: keys[0].toLowerCase().replace(/[^a-z]/g, '_'),
		schema: schema.$$links[keys[0]]
	}
}

module.exports = (table, schema, options = {}) => {
	const link = getLink(schema)

	let query = []

	const linkCard = link ? `link__${link.slug}` : null
	const linkedCard = link ? `linked_card__${link.slug}` : null

	if (link && link.schema) {
		query.push(`, array_agg(to_jsonb(${linkedCard})) AS "links.${link.slug}"`)
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

	if (!_.isPlainObject(schema)) {
		throw new Error(`schema should be an object, received: ${schema}`)
	}

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
				`${table}.updated_at`
			])
		} else {
			query.unshift('*')
		}
	} else {
		const topLevelKeys = []
		for (const key of expression.keys.entries()) {
			const parts = key[0].split('/')

			// We don't support nested filtering here yet
			if (parts.length > 1) {
				continue
			}

			topLevelKeys.push(`${table}.${parts[0]}`)
		}

		query.unshift(topLevelKeys.join(',\n'))
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
		if (!_.isNumber(options.skip)) {
			throw new Error(`options.skip should be a number, received: ${options.skip}`)
		}
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		if (!_.isNumber(options.limit)) {
			throw new Error(`options.limit should be a number, received: ${options.limit}`)
		}
		query.push(`LIMIT ${options.limit}`)
	}

	return query.join('\n')
}
