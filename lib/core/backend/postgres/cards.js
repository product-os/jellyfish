/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const Bluebird = require('bluebird')
const pgFormat = require('pg-format')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const uuid = require('@balena/jellyfish-uuid')
const assert = require('@balena/jellyfish-assert')
const metrics = require('@balena/jellyfish-metrics')
const utils = require('./utils')
const traverse = require('traverse')
const textSearch = require('./jsonschema2sql/text-search')

const CARDS_TABLE = 'cards'
const CARDS_TRIGGER_COLUMNS = [
	'active',
	'version_major',
	'version_minor',
	'version_patch',
	'name',
	'tags',
	'markers',
	'links',
	'requires',
	'capabilities',
	'data',
	'linked_at'
]

const CARDS_SELECT = [
	'id',
	'slug',
	'type',
	'active',
	'CONCAT_WS(\'.\', COALESCE(version_major, \'1\'), COALESCE(version_minor, \'0\'), COALESCE(version_patch, \'0\')) AS version',
	'name',
	'tags',
	'markers',
	'created_at',
	'linked_at',
	'updated_at',
	'links',
	'requires',
	'capabilities',
	'data'
].join(', ')

exports.TABLE = CARDS_TABLE
exports.TRIGGER_COLUMNS = CARDS_TRIGGER_COLUMNS

exports.setup = async (context, connection, database, options = {}) => {
	const table = options.table || exports.TABLE

	const tables = _.map(await connection.any(`
		SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`),
	'table_name')
	if (!tables.includes(table)) {
		await connection.any(`
			CREATE TABLE IF NOT EXISTS ${table} (
				id UUID PRIMARY KEY NOT NULL,
				slug VARCHAR (255) NOT NULL,
				type TEXT NOT NULL,
				active BOOLEAN NOT NULL,
				version_major INTEGER DEFAULT 1,
				version_minor INTEGER,
				version_patch INTEGER,
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
				new_updated_at TIMESTAMP WITH TIME ZONE,
				UNIQUE (slug, version_major, version_minor, version_patch),
				CONSTRAINT version_positive
					CHECK (version_major >= 0 AND version_minor >= 0 AND version_patch >= 0))`)

		/*
		 * Disable compression on the jsonb columns so we can access
		 * its properties faster.
		 * See http://erthalion.info/2017/12/21/advanced-json-benchmarks/
		 */
		await connection.any(`
			ALTER TABLE ${table}
			ALTER COLUMN data SET STORAGE EXTERNAL,
			ALTER COLUMN links SET STORAGE EXTERNAL,
			ALTER COLUMN linked_at SET STORAGE EXTERNAL`)
	}

	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 */
	const indexes = _.map(await connection.any(`SELECT * FROM pg_indexes WHERE tablename = '${table}'`), 'indexname')

	/*
	 * Remove slug unique constraint
	 */
	await connection.any(`
		SET statement_timeout = 0;
		ALTER TABLE ${table}
		DROP CONSTRAINT IF EXISTS ${table}_slug_key;`)

	if (options.noIndexes) {
		return
	}

	/*
	 * Increase work memory for better performance
	 * TODO: Set this value in k8s configuration instead of here
	 */
	await connection.any(`
		SET work_mem TO '256 MB';
	`)

	await Bluebird.map([ {
		column: 'slug'
	}, {
		column: 'tags',
		indexType: 'GIN'
	}, {
		column: 'type'
	}, {
		name: 'data_mirrors',
		column: '(data->\'mirrors\')',
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
		const fullyQualifiedIndexName = `${secondaryIndex.name || secondaryIndex.column}_${table}_idx`

		/*
		 * Lets not create the index if it already exists.
		 */
		if (indexes.includes(fullyQualifiedIndexName)) {
			return
		}

		logger.debug(context, 'Attempting to create table index', {
			table,
			database,
			index: secondaryIndex.column
		})

		await connection.any(`
			CREATE INDEX IF NOT EXISTS ${fullyQualifiedIndexName} ON ${table}
			USING ${secondaryIndex.indexType || 'BTREE'} (${secondaryIndex.column} ${secondaryIndex.options || ''})`)
	}, {
		concurrency: 4
	})

	/*
	 * Create function that allows us to create tsvector indexes from text[] fields.
	 */
	await connection.any(`
		CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], sep text) RETURNS text AS $$
			SELECT array_to_string(arr, sep);
		$$ LANGUAGE SQL IMMUTABLE`)
}

exports.getById = async (context, connection, id, options = {}) => {
	const table = options.table || exports.TABLE

	logger.debug(context, 'Getting element by id', {
		id,
		table
	})

	const results = await connection.any({
		name: `cards-getbyid-${table}`,
		text: `SELECT ${CARDS_SELECT} FROM ${table} WHERE id = $1 LIMIT 1;`,
		values: [ id ]
	})

	if (results[0]) {
		metrics.markCardReadFromDatabase(results[0])
	}

	return results[0] || null
}

exports.getBySlug = async (context, connection, slug, options = {}) => {
	const table = options.table || exports.TABLE

	logger.debug(context, 'Getting element by slug', {
		slug,
		table
	})

	const [ base, version ] = slug.split('@')
	const [ major, minor, patch ] = version.split('.')

	let results = []
	if (!version || version === 'latest') {
		results = await connection.any({
			name: `cards-getbyslug-noversion-${table}`,
			text: `SELECT ${CARDS_SELECT} FROM ${table}
				WHERE slug = $1
				ORDER BY version_major DESC NULLS LAST,
								 version_minor DESC NULLS LAST,
								 version_patch DESC NULLS LAST;
				LIMIT 1;`,
			values: [ base ]
		})
	} else {
		results = await connection.any({
			name: `cards-getbyslug-version-major-minor-patch-${table}`,
			text: `SELECT ${CARDS_SELECT} FROM ${table}
				WHERE slug = $1 AND
				(version_major = $2 OR version_major IS NULL) AND
				(version_minor = $3 OR version_minor IS NULL) AND
				(version_patch = $4 OR version_patch IS NULL)
				ORDER BY version_major DESC NULLS LAST,
								 version_minor DESC NULLS LAST,
								 version_patch DESC NULLS LAST
				LIMIT 1;`,
			values: [ base, major, minor, patch ]
		})
	}
	_.forEach(results, utils.convertDatesToISOString)
	_.forEach(results, (result) => {
		metrics.markCardReadFromDatabase(result)
	})

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
		text: `SELECT ${CARDS_SELECT} FROM ${table} WHERE id = ANY ($1)`,
		values: [ ids ]
	})

	_.forEach(results, utils.convertDatesToISOString)
	_.forEach(results, (result) => {
		metrics.markCardReadFromDatabase(result)
	})

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

	const [ major, minor, patch ] = insertedObject.version.split('.')

	const payload = [
		elementId,
		insertedObject.slug,
		insertedObject.type,
		insertedObject.active,
		major,
		minor,
		patch,
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
					(id, slug, type, active,
					version_major, version_minor, version_patch,
					name, tags, markers, created_at, links, requires,
					capabilities, data, updated_at,
					linked_at, new_created_at, new_updated_at)
				VALUES
					($1, $2, $3, $4,
					$5, $6, $7,
					$8, $9, $10, $11, $12, $13,
					$14, $15, NULL,
					$17, $18, NULL)
				ON CONFLICT (slug, version_major, version_minor, version_patch) DO UPDATE SET
					id = ${table}.id,
					active = $4,
					name = $8,
					tags = $9,
					markers = $10,
					created_at = ${table}.created_at,
					links = ${table}.links,
					requires = $13,
					capabilities = $14,
					data = $15,
					updated_at = $16,
					linked_at = ${table}.linked_at,
					new_created_at = ${table}.new_created_at,
					new_updated_at = $19
				RETURNING ${CARDS_SELECT}`

			results = await connection.any({
				name: `cards-upsert-replace-${table}`,
				text: sql,
				values: payload
			})
		} else {
			const sql = `
				INSERT INTO ${table}
					(id, slug, type, active,
					version_major, version_minor, version_patch,
					name, tags, markers, created_at, links, requires,
					capabilities, data, updated_at,
					linked_at, new_created_at, new_updated_at)
				VALUES
					($1, $2, $3, $4, $5, $6, $7, $8,
					$9, $10, $11, $12, $13, $14,
					$15, $16, $17, $18, $19)
				RETURNING ${CARDS_SELECT}`
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
	insertedObject.version = results[0].version

	utils.convertDatesToISOString(insertedObject)

	options.replace ? metrics.markCardUpsert(insertedObject) : metrics.markCardInsert(insertedObject)

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

/**
 * @param {Object} context - Session context
 * @param {Object} connection - Database connection
 * @param {String[]} fields - Fields to use as an index
 * @param {String} type - The card type to constrain the index by
 *
 * @example
 * const fields = [ 'name',	'data.from.id',	'data.to.id' ]
 * await cards.createTypeIndex(context, connection, 'cards', fields, 'link')
 */
exports.createTypeIndex = async (context, connection, fields, type) => {
	/*
	 * This query will give us a list of all the indexes
	 * on a particular table.
	 */
	const indexes = _.map(await connection.any(`SELECT * FROM pg_indexes WHERE tablename = '${CARDS_TABLE}'`), 'indexname')

	/*
	 * This is the actual name of the index that we will create
	 * in Postgres.
	 *
	 * Keep in mind that if you change this, then this code will
	 * not be able to cleanup older indexes with the older
	 * name convention.
	 */
	const fullyQualifiedIndexName = `${type}__${fields.join('__').replace(/\./g, '_')}__idx`

	/*
	 * Lets not create the index if it already exists.
	 */
	if (indexes.includes(fullyQualifiedIndexName)) {
		return
	}

	logger.debug(context, 'Attempting to create cards table type index', {
		index: fields,
		type
	})

	const columns = []
	for (const path of fields) {
		// Make the assumption that if the index is dot seperated, it is a json path
		const keys = path.split('.').map((value, arrayIndex) => {
			// Escape input before sending it to the DB
			return arrayIndex === 0 ? pgFormat.ident(value) : pgFormat.literal(value)
		})

		if (keys.length === 1) {
			columns.push(keys[0])
		} else {
			const final = keys.pop()
			columns.push(`(${keys.join('->')}->>${final})`)
		}
	}

	const versionedType = type.includes('@') ? type : `${type}@1.0.0`

	// Statement timeout is set to 0 to prevent large index creations from timing out
	await connection.task(async (task) => {
		await task.any('SET statement_timeout=0')
		await task.any(`CREATE INDEX CONCURRENTLY IF NOT EXISTS "${fullyQualifiedIndexName}" ON ${CARDS_TABLE}
		(${columns.join(',')}) WHERE type=${pgFormat.literal(versionedType)}`)
	})
}

/**
 * @param {Object} context - session context
 * @param {Object} connection - database connection
 * @param {String} type - card type name
 * @param {Array} fields - fields to build indexes for
 *
 * @example
 * const type = 'message'
 * const fields = [
 *   {
 *     path: [ 'data', 'payload', 'message' ],
 *     type: 'string'
 *   }
 * ]
 * await cards.createFullTextSearchIndex(context, connection, type, fields)
 */
exports.createFullTextSearchIndex = async (context, connection, type, fields) => {
	// Leave early if fields is empty
	if (_.isEmpty(fields)) {
		return
	}

	// Create all necessary search indexes for the given type
	const typeBase = type.split('@')[0]
	const versionedType = `${typeBase}@1.0.0`
	await connection.task(async (task) => {
		const tasks = []
		fields.forEach((field) => {
			const name = `${typeBase}__${field.path.join('_')}__search_idx`
			tasks.push(task.any(`CREATE INDEX IF NOT EXISTS "${name}" ON ${CARDS_TABLE}
				USING GIN(${textSearch.toTSVector(CARDS_TABLE, field.path, field.isRootArray)})
				WHERE type=${pgFormat.literal(versionedType)}`))

			logger.info(context, 'Creating search index', {
				typeBase,
				name
			})
		})

		// Prevent large index creation timeouts and then create all indexes
		await task.any('SET statement_timeout=0')
		await Bluebird.all(tasks).catch((error) => {
			throw error
		})
	})
}

/* @summary Parse field paths denoted as being targets for full-text search
 * @function
 *
 * @param {Object} context - session context
 * @param {Object} schema - type card schema to traverse
 * @param {Object} errors - a set of rich error classes
 * @returns {Array} list of objects containing field path information
 *
 * @example
 * const paths = parseFullTextSearchFields(context, schema, errors)
 */
exports.parseFullTextSearchFields = (context, schema, errors) => {
	const fields = []
	const combinators = [ 'anyOf', 'allOf', 'oneOf' ]
	traverse(schema).forEach(function (node) {
		if (this.key === 'fullTextSearch' && this.node === true && !_.isNil(this.parent.node.type)) {
			// Throw an error if item doesn't have "string" as a possible type.
			const hasStringType = Boolean(_.includes(this.parent.node.type, 'string') ||
				(_.has(this.parent.node, [ 'items', 'type' ]) && this.parent.node.items.type.includes('string')))
			assert.INTERNAL(context, hasStringType,
				errors.JellyfishInvalidSchema, 'Full-text search fields must contain "string" as a possible type')

			if (_.intersection(this.path, combinators).length > 0) {
				// Handle combinators by creating an index for its parent node.
				for (let idx = 0; idx < this.path.length; idx++) {
					if (/^anyOf|allOf|oneOf$/.test(this.path[idx])) {
						const path = exports.fromTypePath(_.slice(this.path, 0, idx))
						if (!_.find(fields, (field) => {
							return _.isEqual(field.path, path)
						})) {
							fields.push({
								path,
								isRootArray: false
							})
						}
					}
				}
			} else {
				fields.push({
					path: exports.fromTypePath(_.dropRight(this.path)),
					isRootArray: exports.isRootArray(this.parent.node.type, this.parent.path)
				})
			}
		}
	})
	return fields
}

/**
 * @summary Convert field path in type card to path used inside of cards of that type
 * @function
 *
 * @param {Array} from - full path to field as defined in the type card
 * @returns {Array} path to same field but in the context of non-type card
 *
 * @example
 * const from = [ 'data', 'schema', 'properties', 'data', 'properties', 'tags' ]
 * const path = cards.fromTypePath(from)
 */
exports.fromTypePath = (from) => {
	const path = from.join('.').replace(/^data\.schema\.properties\./, '').split('.')
	const target = path.pop()
	_.remove(path, (element) => {
		return element === 'properties'
	})
	path.push(target)
	return path
}

/**
 * @summary Check if an item is a root-level array
 * @function
 *
 * @param {String} type - item type
 * @param {Array} path - path to item in array format
 * @returns {Boolean} boolean denoting if is root-level array
 *
 * @example
 * const type = 'array'
 * const path = [ 'data', 'schema', 'properties', 'tags' ]
 * const result = exports.isRootArray(type, path)
 */
exports.isRootArray = (type, path) => {
	return Boolean(type === 'array' && _.isEqual(_.dropRight(path), [ 'data', 'schema', 'properties' ]))
}
