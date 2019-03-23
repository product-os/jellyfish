/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const debouncePromise = require('debounce-promise')
const logger = require('../../../logger').getLogger(__filename)
const environment = require('../../../environment')
const LINK_TYPE = 'has member'

exports.getTable = (source) => {
	return `${source}_markers`
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
				member.slug,
				array_agg(${options.source}.slug) AS "markers"
			FROM ${options.source}
			INNER JOIN ${options.links} AS link ON (
				(link.fromId = ${options.source}.id AND link.name = '${LINK_TYPE}') OR
				(link.toId = ${options.source}.id AND link.inverseName = '${LINK_TYPE}')
			)
			INNER JOIN ${options.source} AS member
			ON (
				link.toId = member.id OR link.fromId = member.id
			)
			WHERE
			${options.source}.type = 'org'
			AND
			member.type = 'user'
			GROUP BY
			member.slug
			WITH DATA`)
	}

	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 */
	const indexes = _.map(await connection.any(`
		SELECT * FROM pg_indexes WHERE tablename = '${table}'`),
	'indexname')

	const index = `idx_${table}_slug`
	if (!indexes.includes(index)) {
		/*
		 * We need a unique index that is not part of the WHERE clause
		 * in order to be able to update the vire concurrently.
		 * See https://www.postgresql.org/docs/9.4/sql-refreshmaterializedview.html
		 */
		await connection.any(`
			CREATE UNIQUE INDEX ${index} ON ${table}
			USING BTREE (slug)`)
	}
}

const refreshView = environment.isProduction()
	? debouncePromise((connection, view) => {
		/*
		 * The "CONCURRENTLY" option allows the database to serve other
		 * queries on the materialized view while we update it.
		 */
		return connection.any(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`)
	}, 500, {
		leading: true
	})

	/*
	 * A synchronous refresh is faster if there are few actions
	 * happening at the same time, so it gives us a little boost
	 * when running the test suite.
	 */
	: async (connection, view) => {
		return connection.any(`REFRESH MATERIALIZED VIEW ${view}`)
	}

exports.refresh = async (context, connection, options) => {
	const table = exports.getTable(options.source)
	const refreshStart = new Date()
	await refreshView(connection, table)
	const refreshEnd = new Date()
	logger.info(context, 'Refreshed markers', {
		time: refreshEnd.getTime() - refreshStart.getTime()
	})
}

exports.getUserMarkers = async (context, connection, user, options = {}) => {
	const table = exports.getTable(options.source)
	const result = await connection.any(
		`SELECT markers FROM ${table} WHERE slug = '${user.slug}' LIMIT 1`)
	if (result.length === 0) {
		return []
	}

	return result[0].markers
}
