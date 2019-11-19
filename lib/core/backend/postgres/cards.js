/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const logger = require('../../../logger').getLogger(__filename)
const uuid = require('../../../uuid')
const assert = require('../../../assert')
const utils = require('./utils')
const CARDS_TABLE = 'cards'
const CARDS_TRIGGER_COLUMNS = [
	'active', 'version', 'name', 'tags', 'markers', 'links', 'requires', 'capabilities', 'data', 'linked_at'
]

exports.TABLE = CARDS_TABLE
exports.TRIGGER_COLUMNS = CARDS_TRIGGER_COLUMNS

exports.setup = async (context, connection, database, options = {}) => {
	const table = options.table || exports.TABLE

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
		CREATE TABLE IF NOT EXISTS ${table} (
			id UUID PRIMARY KEY NOT NULL,
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
			data JSONB NOT NULL,
			updated_at TEXT,
			linked_at JSONB NOT NULL,
			new_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
			new_updated_at TIMESTAMP WITH TIME ZONE
		);

		ALTER TABLE ${table} ADD IF NOT EXISTS updated_at TEXT;
		ALTER TABLE ${table} ADD IF NOT EXISTS linked_at JSONB;
		ALTER TABLE ${table} ADD IF NOT EXISTS new_created_at TIMESTAMP WITH TIME ZONE;
		ALTER TABLE ${table} ADD IF NOT EXISTS new_updated_at TIMESTAMP WITH TIME ZONE;
		`)

	if (options.noIndexes) {
		return
	}

	/*
	 * Disable compression on the jsonb columns so we can access
	 * its properties faster.
	 * See http://erthalion.info/2017/12/21/advanced-json-benchmarks/
	 */
	for (const column of [ 'data', 'links', 'linked_at' ]) {
		await connection.any(`
			ALTER TABLE ${table} ALTER COLUMN ${column}
			SET STORAGE EXTERNAL`)
	}

	/*
	 * Increase work memory for better performance
	 * TODO: Set this value in k8s configuration instead of here
	 */
	await connection.any(`
		SET work_mem TO '256 MB';
	`)

	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 */
	const indexes = _.map(await connection.any(`SELECT * FROM pg_indexes WHERE tablename = '${table}'`), 'indexname')

	await Bluebird.map([ {
		column: 'slug'
	}, {
		column: 'tags',
		indexType: 'GIN'
	}, {
		column: 'type'
	}, {
		column: 'data',
		indexType: 'GIN',
		options: 'jsonb_path_ops'
	}, {
		column: 'created_at',
		options: 'DESC'
	}, {
		column: 'updated_at'
	} ], async (secondaryIndex) => {
		/*
		 * This is the actual name of the index that we will create
		 * in Postgres.
		 *
		 * Keep in mind that if you change this, then this code will
		 * not be able to cleanup older indexes with the older
		 * name convention.
		 */
		const fullyQualifiedIndexName = `${secondaryIndex.column}_${table}_idx`

		/*
		 * Lets not create the index if it already exists.
		 */
		if (indexes.includes(fullyQualifiedIndexName)) {
			return
		}

		logger.debug(context, 'Creating table index', {
			table,
			database,
			index: secondaryIndex.column
		})

		await connection.any(`
			CREATE INDEX ${fullyQualifiedIndexName} ON ${table}
			USING ${secondaryIndex.indexType || 'BTREE'} (${secondaryIndex.column} ${secondaryIndex.options || ''})`)
	}, {
		concurrency: 4
	})
}

exports.getById = async (context, connection, id, options = {}) => {
	const table = options.table || exports.TABLE

	logger.debug(context, 'Getting element by id', {
		id,
		table
	})

	const results = await connection.any({
		name: `cards-getbyid-${table}`,
		text: `SELECT * FROM ${table} WHERE id = $1 LIMIT 1;`,
		values: [ id ]
	})

	return results[0] || null
}

exports.getBySlug = async (context, connection, slug, options = {}) => {
	const table = options.table || exports.TABLE

	logger.debug(context, 'Getting element by slug', {
		slug,
		table
	})

	const [ base, version ] = slug.split('@')

	let results = []
	if (!version || version === 'latest') {
		results = await connection.any({
			name: `cards-getbyslug-noversion-${table}`,
			text: `SELECT * FROM ${table} WHERE slug = $1 ORDER BY version DESC LIMIT 1;`,
			values: [ base ]
		})
	} else {
		results = await connection.any({
			name: `cards-getbyslug-version-${table}`,
			text: `SELECT * FROM ${table} WHERE slug = $1 AND version = $2 LIMIT 1;`,
			values: [ base, version ]
		})
	}

	_.forEach(results, utils.convertDatesToISOString)

	return results[0] || null
}

exports.getManyById = async (context, connection, ids, options = {}) => {
	const table = options.table || exports.TABLE

	logger.debug(context, 'Batch get by id', {
		count: ids.length,
		table
	})

	const results = await connection.any({
		name: 'cards-getmanybyid',
		text: `SELECT * FROM ${table} WHERE id = ANY ($1)`,
		values: [ ids ]
	})

	_.forEach(results, utils.convertDatesToISOString)

	return results
}

exports.upsert = async (context, errors, connection, object, options) => {
	const table = options.table || exports.TABLE

	assert.INTERNAL(context, object.slug,
		errors.JellyfishDatabaseError, 'Missing primary key')
	assert.INTERNAL(context, object.type,
		errors.JellyfishDatabaseError, 'Missing type')

	const insertedObject = Object.assign({}, object)
	insertedObject.links = {}

	const elementId = options.id || await uuid.random()

	if (options.replace) {
		insertedObject.updated_at = new Date().toISOString()
		logger.debug(context, 'Upserting element', {
			table,
			slug: insertedObject.slug
		})
	} else {
		insertedObject.created_at = new Date().toISOString()
		logger.debug(context, 'Inserting element', {
			table,
			slug: insertedObject.slug
		})
	}

	const payload = [
		elementId,
		insertedObject.slug,
		insertedObject.type,
		insertedObject.active,
		insertedObject.version,
		typeof insertedObject.name === 'string'
			? insertedObject.name
			: null,
		insertedObject.tags,
		insertedObject.markers,
		insertedObject.created_at,
		insertedObject.links,
		insertedObject.requires,
		insertedObject.capabilities,
		insertedObject.data,
		insertedObject.updated_at,
		{},
		new Date(insertedObject.created_at),
		insertedObject.updated_at ? new Date(insertedObject.updated_at) : null
	]

	let results = null

	// Its very important, for concurrency issues, that inserts/upserts
	// remain atomic, in that there is only one atomic request sent to
	// the database. We were previously violating this principle by
	// querying the database before proceeding with the insertion.
	try {
		if (options.replace) {
			const sql = `
				INSERT INTO ${table} 
					(id, slug, type, active, version, name, tags, markers, 
					created_at, links, requires, capabilities, data, updated_at, 
					linked_at, new_created_at, new_updated_at)
				VALUES 
					($1, $2, $3, $4, $5, $6, $7, $8, 
					$9, $10, $11, $12, $13, NULL, 
					$15, $16, NULL)
				ON CONFLICT (slug) DO UPDATE SET
					id = ${table}.id,
					active = $4,
					version = $5,
					name = $6,
					tags = $7,
					markers = $8,
					created_at = ${table}.created_at,
					links = ${table}.links,
					requires = $11,
					capabilities = $12,
					data = $13,
					updated_at = $14,
					linked_at = ${table}.linked_at,
					new_created_at = ${table}.new_created_at,
					new_updated_at = $17
				RETURNING *`

			results = await connection.any({
				name: `cards-upsert-replace-${table}`,
				text: sql,
				values: payload
			})
		} else {
			const sql = `
				INSERT INTO ${table}
					(id, slug, type, active, version, name, tags, markers, 
					created_at, links, requires, capabilities, data, updated_at, 
					linked_at, new_created_at, new_updated_at)
				VALUES 
					($1, $2, $3, $4, $5, $6, $7, $8, 
					$9, $10, $11, $12, $13, $14, 
					$15, $16, $17)
				RETURNING *`
			results = await connection.any({
				name: `cards-upsert-insert-${table}`,
				text: sql,
				values: payload
			})
		}
	} catch (error) {
		if (/^duplicate key value/.test(error.message)) {
			const upsertError = new errors.JellyfishElementAlreadyExists(
				`There is already an element with slug ${object.slug}`)
			upsertError.slug = object.slug
			throw upsertError
		}

		if (/^value too long/.test(error.message)) {
			throw new errors.JellyfishInvalidSlug(
				`The primary key is too long: ${object.slug}`)
		}

		if (/canceling statement due to statement timeout/.test(error.message)) {
			const verb = options.replace ? 'upserting' : 'inserting'
			throw new errors.JellyfishDatabaseTimeoutError(
				`Timeout when ${verb} ${object.slug}`)
		}

		throw new errors.JellyfishDatabaseError(error.message)
	}

	insertedObject.name = typeof insertedObject.name === 'string'
		? insertedObject.name
		: null
	insertedObject.id = results[0].id
	insertedObject.created_at = results[0].created_at
	insertedObject.updated_at = results[0].updated_at
	insertedObject.linked_at = results[0].linked_at

	utils.convertDatesToISOString(insertedObject)

	return insertedObject
}

exports.materializeLink = async (context, errors, connection, card, options = {}) => {
	const table = options.table || exports.TABLE

	try {
		const sql = `
			UPDATE ${table}
				SET linked_at = $1::jsonb
			WHERE id = $2;`
		await connection.any({
			name: `cards-materializelink-${table}`,
			text: sql,
			values: [ card.linked_at, card.id ]
		})
	} catch (error) {
		if (/^duplicate key value/.test(error.message)) {
			throw new errors.JellyfishElementAlreadyExists(
				`There is already an element with the slug ${card.slug}`)
		}

		if (/^value too long/.test(error.message)) {
			throw new errors.JellyfishInvalidSlug(
				`The primary key is too long: ${card.slug}`)
		}

		throw new errors.JellyfishDatabaseError(error.message)
	}
}
