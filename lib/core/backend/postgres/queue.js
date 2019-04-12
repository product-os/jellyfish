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
	 * For backwards compatibility purposes. Delete
	 * the old materialized version of this view if
	 * it exists. This snippet can be deleted once
	 * we fully migrate to the non-materialized view.
	 */
	const views = _.map(await connection.any(`
		SELECT oid::regclass::text FROM pg_class
		WHERE relkind = 'm'`), 'oid')
	if (views.includes(table)) {
		await connection.any(`DROP MATERIALIZED VIEW IF EXISTS ${table}`)
	}

	await connection.any(`
		CREATE OR REPLACE VIEW ${table} AS
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
		WHERE
			cards.type = 'action-request' AND
			cards.links->'${LINK_TYPE}' IS NULL AND
			cards.linked_at->'${LINK_TYPE}' IS NULL`)
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
