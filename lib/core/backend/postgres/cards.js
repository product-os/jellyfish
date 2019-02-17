/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const logger = require('../../../logger').getLogger(__filename)
const CARDS_TABLE = 'cards'

exports.setup = async (context, connection, database) => {
	/*
	 * Create the table if it doesn't exist.
	 *
	 * TODO(jviotti): Keep in mind that if we change
	 * this structure and deploy to production, then
	 * the new structure won't be applied, as we would
	 * see that the table already exists and move
	 * one without applying the changes.
	 */
	await connection.any(`
		CREATE TABLE IF NOT EXISTS ${CARDS_TABLE} (
			id TEXT PRIMARY KEY NOT NULL,
			slug VARCHAR (255) UNIQUE NOT NULL,
			type TEXT NOT NULL,
			active BOOLEAN NOT NULL,
			version TEXT NOT NULL,
			name TEXT,
			tags TEXT[] NOT NULL,
			markers TEXT[] NOT NULL,
			created_at TEXT NOT NULL,
			links JSONB NOT NULL,
			requires JSONB[] NOT NULL,
			capabilities JSONB[] NOT NULL,
			data JSONB NOT NULL)`)

	/*
	 * Disable compression on the jsonb columns so we can access
	 * its properties faster.
	 * See http://erthalion.info/2017/12/21/advanced-json-benchmarks/
	 */
	for (const column of [ 'data', 'links' ]) {
		await connection.any(`
			ALTER TABLE ${CARDS_TABLE} ALTER COLUMN ${column}
			SET STORAGE EXTERNAL`)
	}

	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 *
	 * TODO(jviotti): We could select all indexes from "pg_indexes"
	 * without filtering by table and keep that as a data structure
	 * that we then use in every iteration of this loop to avoid
	 * having to make queries for the list of indexes multiple times.
	 */
	const indexes = _.map(await connection.any(`
		SELECT * FROM pg_indexes WHERE tablename = '${CARDS_TABLE}'`),
	'indexname')

	await Bluebird.map([ 'slug', 'type', 'data' ], async (secondaryIndex) => {
		/*
		 * This is the actual name of the index that we will create
		 * in Postgres.
		 *
		 * Keep in mind that if you change this, then this code will
		 * not be able to cleanup older indexes with the older
		 * name convention.
		 */
		const fullyQualifiedIndexName = `${secondaryIndex}_${CARDS_TABLE}_idx`

		/*
		 * Lets not create the index if it already exists.
		 */
		if (indexes.includes(fullyQualifiedIndexName)) {
			return
		}

		logger.debug(context, 'Creating table index', {
			table: CARDS_TABLE,
			database,
			index: secondaryIndex
		})

		/*
		 * A GIN index on the whole JSON column is known to speed
		 * up queries that use JSON functions on this column.
		 */
		if (secondaryIndex === 'data') {
			await connection.any(`
				CREATE INDEX ${fullyQualifiedIndexName} ON ${CARDS_TABLE}
				USING GIN (${secondaryIndex} jsonb_path_ops)`)
			return
		}

		/*
		 * This is the point where we actually create the index.
		 * Notice that all these are indexes on fields inside
		 * the column that contains the card JSON contents.
		 *
		 * TODO(jviotti): Why BTREE in particular? How did we
		 * determine that it was the best configuration?
		 */
		await connection.any(`
			CREATE INDEX ${fullyQualifiedIndexName} ON ${CARDS_TABLE}
			USING BTREE (${secondaryIndex})`)
	}, {
		concurrency: 4
	})
}

exports.getById = async (context, connection, id) => {
	logger.debug(context, 'Getting element by id', {
		id,
		table: CARDS_TABLE
	})

	const results = await connection.any(`
		SELECT * FROM ${CARDS_TABLE} WHERE id = $1 LIMIT 1;`, [ id ])

	if (results[0] && typeof results[0].name !== 'string') {
		Reflect.deleteProperty(results[0], 'name')
	}

	return results[0] || null
}

exports.getBySlug = async (context, connection, slug) => {
	logger.debug(context, 'Getting element by slug', {
		slug,
		table: CARDS_TABLE
	})

	const results = await connection.any(`
		SELECT * FROM ${CARDS_TABLE} WHERE slug = $1 LIMIT 1;`, [ slug ])

	if (results[0] && typeof results[0].name !== 'string') {
		Reflect.deleteProperty(results[0], 'name')
	}

	return results[0] || null
}

exports.getManyById = async (context, connection, ids) => {
	logger.debug(context, 'Batch get by id', {
		count: ids.length,
		table: CARDS_TABLE
	})

	const quotedIds = ids.map((id) => {
		return `'${id}'`
	})

	const results = await connection.any(`
		SELECT * FROM ${CARDS_TABLE} WHERE id IN (${quotedIds});`)

	return results
}
