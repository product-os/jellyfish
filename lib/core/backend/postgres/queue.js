/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const LINK_TYPE = 'is executed by'

exports.getTable = (source) => {
	return `${source}_queue`
}

exports.setup = async (context, connection, options = {}) => {
	const table = exports.getTable(options.source)

	/*
	 * List all materialized views
	 */
	const views = _.map(await connection.any(`
		SELECT oid::regclass::text FROM pg_class
		WHERE relkind = 'm'`), 'oid')

	if (!views.includes(table)) {
		await connection.any(`
			CREATE MATERIALIZED VIEW ${table} AS
			SELECT
				cards.id,
				cards.slug,
				cards.type,
				cards.active,
				cards.version,
				cards.name,
				cards.tags,
				cards.markers,
				cards.created_at,
				cards.links,
				cards.requires,
				cards.capabilities,
				cards.data
			FROM cards
			LEFT JOIN ${options.links} AS link ON (
				(link.toId = cards.id AND link.inverseName = '${LINK_TYPE}')
			)
			WHERE
				link IS NULL
			AND
				cards.type = 'action-request'
			WITH DATA`)
	}

	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 */
	const indexes = _.map(await connection.any(`
		SELECT * FROM pg_indexes WHERE tablename = '${table}'`),
	'indexname')

	const index = `idx_${table}_id`
	if (!indexes.includes(index)) {
		/*
		 * We need a unique index that is not part of the WHERE clause
		 * in order to be able to update the vire concurrently.
		 * See https://www.postgresql.org/docs/9.4/sql-refreshmaterializedview.html
		 */
		await connection.any(`
			CREATE UNIQUE INDEX ${index} ON ${table}
			USING BTREE (id)`)
	}
}

exports.refresh = async (context, connection, options) => {
	const table = exports.getTable(options.source)
	await connection.any(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${table}`)
}

exports.getElements = async (context, connection, options = {}) => {
	const query = [
		`SELECT * FROM ${exports.getTable(options.source)}`
	]

	if (options.skip) {
		query.push(`OFFSET ${options.skip}`)
	}

	if (options.limit) {
		query.push(`LIMIT ${options.limit}`)
	}

	return connection.any(query.join('\n'))
}

exports.getCount = async (connection, options = {}) => {
	const table = exports.getTable(options.source)
	const result = await connection.any(`SELECT COUNT (id) FROM ${table}`)
	return _.parseInt(result[0].count)
}
