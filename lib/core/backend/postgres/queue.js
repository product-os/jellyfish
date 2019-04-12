/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const debouncePromise = require('debounce-promise')
const logger = require('../../../logger').getLogger(__filename)
const environment = require('../../../environment')
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
				cards.data,
				cards.updated_at,
				cards.linked_at
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

const refreshView = environment.isProduction()
	? debouncePromise(async (context, connection, view) => {
		const refreshStart = new Date()

		/*
		 * The "CONCURRENTLY" option allows the database to serve other
		 * queries on the materialized view while we update it.
		 */
		await connection.any(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`)

		const refreshEnd = new Date()
		logger.info(context, 'Refreshed queue', {
			time: refreshEnd.getTime() - refreshStart.getTime()
		})
	}, 1000, {
		leading: false
	})

	/*
	 * A synchronous refresh is faster if there are few actions
	 * happening at the same time, so it gives us a little boost
	 * when running the test suite.
	 */
	: async (context, connection, view) => {
		const refreshStart = new Date()
		await connection.any(`REFRESH MATERIALIZED VIEW ${view}`)
		const refreshEnd = new Date()
		logger.info(context, 'Refreshed queue', {
			time: refreshEnd.getTime() - refreshStart.getTime()
		})
	}

exports.refresh = async (context, connection, options) => {
	const table = exports.getTable(options.source)

	// We are intentionally doing this on a fire and forget fashion
	// as we want to treat this as a background process, and not
	// have it block the action HTTP requests.
	refreshView(context, connection, table).catch((error) => {
		logger.exception(context, 'Refresh queue error', error)
	})
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
