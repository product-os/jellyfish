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

const walk = (schema, path, context, onKey) => {
	if (builder.isPrefixedProperty(path) && path[1]) {
		onKey(path[1])
	}

	if (!schema) {
		return {
			sql: false
		}
	}

	const result = []

	for (const [ key, value ] of Object.entries(schema)) {
		// Ignore unrecognized keywords
		if (!keywords[key]) {
			continue
		}

		const conjunct = keywords[key](
			value, path, walk, schema, context, onKey)
		result.push(conjunct)
	}

	return {
		sql: builder.and(...result)
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

	let query = [
		'SELECT',
		'*'
	]

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
				`  (${linkCard}.fromId = ${linkedCard}.id) OR`,
				`  (${linkCard}.toId = ${linkedCard}.id)`,
				')'
			])
		}
	}

	if (_.isBoolean(schema)) {
		query.push(`SELECT * FROM ${table}`)
		if (!schema) {
			query.push('WHERE false')
		}

		return query.join('\n')
	}

	if (!_.isPlainObject(schema)) {
		throw new Error(`schema should be an object, received: ${schema}`)
	}

	const cardKeys = new Set()
	const filter = [
		walk(schema, [ table ], null, (key) => {
			cardKeys.add(key)
		}).sql
	]

	if (schema.additionalProperties === true) {
		query.splice(1, 1, ...[
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
			`${table}.data`
		])
	} else {
		query.splice(1, 1, ...Array.from(cardKeys).map((key, index, array) => {
			const suffix = index === array.length - 1 ? '' : ','
			return `${table}.${key}${suffix}`
		}))
	}

	if (!Array.isArray(filter) || filter.length > 0) {
		filter.unshift('WHERE')
		query = query.concat(filter)
	}

	if (link) {
		query.push('AND')

		if (link.schema) {
			query.push(`(${walk(link.schema, [ linkedCard ], null, _.noop).sql})`)
		} else {
			query.push(`${linkCard} IS NULL`)
		}

		query.push(`GROUP BY ${table}.id`)
	}

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
