/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const Bluebird = require('bluebird')
const pgp = require('pg-promise')()
const skhema = require('skhema')
const uuid = require('uuid/v4')
const logger = require('../../../logger').getLogger(__filename)
const jellyscript = require('../../../jellyscript')
const jsonschema2sql = require('./jsonschema2sql')
const PGLiveSelect = require('./pg-live-select')
const links = require('./links')

const JSON_COLUMN = 'card_data'

const BUCKETS = {
	cards: 'cards',
	requests: 'requests',
	links: 'links',
	sessions: 'sessions'
}

const LOCK_TABLE = 'locks'
const ALL_BUCKETS = Object.values(BUCKETS)
const SORT_KEY = '$$sort'
const LINK_KEY = '$$links'

const SECONDARY_INDEX = [ 'id', 'type' ]

const filter = (schema, element) => {
	const result = skhema.filter(schema, element)

	// If additionalProperties is false, remove properties that haven't been
	// explicitly selected. This is done because the Skhema module will merge
	// anyOf branches into the top level properties before applying the filter
	// (which is correct) however, due to the Jellyfish permissions system,
	// properties may be added to the result that the initial query did not
	// specify, depending on which permission views are merged in.
	if (schema.additionalProperties === false) {
		for (const item of _.castArray(element)) {
			for (const key in item) {
				if (!schema.properties[key]) {
					Reflect.deleteProperty(item, key)
				}
			}
		}
	}

	return result
}

const defaultAdditionalPropertiesFalse = (schema) => {
	// Default additionalProperties to false, to limit the ammount of retruned
	// data unless specifically requested
	if (!schema.hasOwnProperty('additionalProperties')) {
		return Object.assign({}, schema, {
			additionalProperties: false
		})
	}

	return schema
}

const createStreamClient = async (context, connection) => {
	const sco = await connection.connect()
	const name = 'jellyfish'
	const lq = new PGLiveSelect(sco.client, name, context)

	const emitter = await mergeStreams(ALL_BUCKETS, async (table) => {
		const handle = await lq.select(`SELECT * FROM ${table}`)

		handle.close = async () => {
			try {
				await lq.cleanup()
			} catch (error) {
				logger.warn(context, 'Hit error when cleaning up stream client', {
					table,
					database: this.database,
					error: error.message
				})
			}
		}

		return handle
	})

	const prevClose = emitter.close

	emitter.close = async () => {
		await prevClose()
		await sco.done()
	}

	return emitter
}

const getBucketForType = (type) => {
	// We decided to store certain cards in
	// different tables for performance reasons

	if (type === 'action-request' || type === 'execute') {
		return BUCKETS.requests
	}

	if (type === 'session') {
		return BUCKETS.sessions
	}

	if (type === 'link') {
		return BUCKETS.links
	}

	return BUCKETS.cards
}

const getBucketsForSchema = (schema) => {
	const type = schema.properties &&
		schema.properties.type &&
		schema.properties.type.const
		? schema.properties.type.const : null

	if (!type) {
		return ALL_BUCKETS
	}

	return [ getBucketForType(type) ]
}

const mergeStreams = async (keys, createFunction) => {
	const emitter = new EventEmitter()
	const streams = {}

	emitter.closeStream = async (key) => {
		if (!streams[key]) {
			return
		}

		await streams[key].close()
		Reflect.deleteProperty(streams, key)
	}

	emitter.restartStream = async (key) => {
		await emitter.closeStream(key)
		streams[key] = await createFunction(key)
	}

	for (const key of keys) {
		await emitter.restartStream(key)
		streams[key].on('closed', () => {
			Reflect.deleteProperty(streams, key)
			if (_.isEmpty(streams)) {
				emitter.emit('closed')
			}
		})

		streams[key].on('error', (error) => {
			emitter.emit('error', error, key)
		})

		streams[key].on('data', (data) => {
			emitter.emit('data', data)
		})

		streams[key].on('change', (data) => {
			emitter.emit('change', data)
		})
	}

	emitter.close = async () => {
		for (const value of Object.values(streams)) {
			await value.close()
		}
	}

	return emitter
}

const queryTable = async (context, backend, table, schema, options) => {
	logger.debug(context, 'Querying from table', {
		table,
		database: backend.database,
		limit: options.limit,
		skip: options.skip,
		sortBy: options.sortBy
	})

	const config = _.defaults(_.omit(options, [ 'limit' ]), {
		sortBy: [ 'data', 'timestamp' ],

		// Exclude converting additionalProperties to SQL, as its used for field
		// filtering rather than record selection and will typically break the
		// generated SQL query, causing no results to be returned
		exclude: [ 'additionalProperties' ]
	})

	const query = jsonschema2sql(table, schema, config)
	const results = await backend.connection.any(query)

	const rows = _.map(results, JSON_COLUMN)
	const elements = await Bluebird.map(rows, async (card) => {
		return resolveLinks(context, backend, schema, config, card)
	}, {
		concurrency: 3
	})

	const filteredElements = filter(schema, elements)

	// TODO: Doing application side limiting is really bad, but
	// is the only way to do it correctly on this implementation
	// as we resolve links after we get the response from the
	// database, which is not the same as limitting after the
	// links resolve (which is what we expect)
	const result = options.limit
		? filteredElements.slice(0, options.limit)
		: filteredElements

	logger.debug(context, 'Query database response', {
		table,
		database: backend.database,
		count: result.length
	})

	return result
}

const assertTable = (table, errors) => {
	if (!_.includes(ALL_BUCKETS, table)) {
		throw new errors.JellyfishDatabaseError(`Can't operate on unknown table: ${table}`)
	}
}

const resolveLinks = async (context, backend, schema, options, card) => {
	const result = await links.evaluateCard({
		getElementsById: (ids, subqueryOptions) => {
			if (options.subquery) {
				return options.subquery(context, ids, subqueryOptions)
			}

			return backend.getElementsById(context, ids, subqueryOptions)
		}
	}, card, schema[LINK_KEY] || {})
	if (!result) {
		return null
	}

	if (!_.isEmpty(result)) {
		// Object.assign is used so that only resolved verbs are modified
		Object.assign(card.links, result)
	}

	return card
}

const getElementsByIdFromTable = async (context, backend, table, ids) => {
	logger.debug(context, 'Batch get by id', {
		count: ids.length,
		table,
		database: backend.database
	})

	assertTable(table, backend.errors)

	const query = jsonschema2sql(table, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				enum: _.uniq(ids)
			}
		},
		required: [ 'id' ]
	})

	const results = await backend.connection.any(query)

	return _.map(results, JSON_COLUMN)
}

const getElementByIdFromTable = async (context, backend, table, id) => {
	logger.debug(context, 'Getting element by id', {
		id,
		table,
		database: backend.database
	})

	assertTable(table, backend.errors)

	const query = jsonschema2sql(table, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: id
			}
		},
		required: [ 'id' ]
	})

	const results = await backend.connection.any(query)

	return _.first(_.map(results, JSON_COLUMN)) || null
}

const getElementBySlugFromTable = async (context, backend, table, slug) => {
	logger.debug(context, 'Getting element by slug', {
		slug,
		table,
		database: backend.database
	})

	assertTable(table, backend.errors)

	const query = jsonschema2sql(table, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: slug
			}
		},
		required: [ 'slug' ]
	})

	const results = await backend.connection.any(query)

	return _.first(_.map(results, JSON_COLUMN)) || null
}

const checkUpsertErrors = (backend, error, object) => {
	if (/^duplicate key value/.test(error.message)) {
		throw new backend.errors.JellyfishElementAlreadyExists(
			`There is already an element with slug ${object.slug}`)
	}

	if (/^value too long/.test(error.message)) {
		throw new backend.errors.JellyfishInvalidSlug(
			`The primary key is too long: ${object.slug}`)
	}

	throw new backend.errors.JellyfishDatabaseError(error.message)
}

const upsertObject = async (context, backend, object, options) => {
	const table = getBucketForType(object.type)

	if (!object.slug) {
		throw new backend.errors.JellyfishDatabaseError('Missing primary key')
	}

	if (!object.type) {
		throw new backend.errors.JellyfishDatabaseError('Missing type')
	}

	assertTable(table, backend.errors)

	const insertedObject = Object.assign({}, object)
	const elementId = uuid()

	if (options.replace) {
		logger.debug(context, 'Upserting element', {
			table,
			slug: insertedObject.slug,
			database: backend.database
		})
	} else {
		logger.debug(context, 'Updating element', {
			table,
			slug: insertedObject.slug,
			database: backend.database
		})
	}

	const payload = Object.assign(insertedObject, {
		id: elementId
	})

	let results = null

	// Its very important, for concurrency issues, that inserts/upserts
	// remain atomic, in that there is only one atomic request sent to
	// the database. We were previously violating this principle by
	// querying the database before proceeding with the insertion.
	try {
		if (options.replace) {
			results = await backend.connection.any(`
				INSERT INTO ${table} VALUES ($1, $2, $3, $4)
				ON CONFLICT (slug)
				DO
					UPDATE
						SET ${JSON_COLUMN} = $4::jsonb || jsonb_build_object('id', ${table}.${JSON_COLUMN}->'id')
				RETURNING *
			`, [
				elementId,
				insertedObject.slug,
				insertedObject.type,
				payload
			])
		} else {
			results = await backend.connection.any(`
				INSERT INTO ${table} VALUES ($1, $2, $3, $4)
				RETURNING *
			`, [
				elementId,
				insertedObject.slug,
				insertedObject.type,
				payload
			])
		}
	} catch (error) {
		checkUpsertErrors(backend, error, object)
	}

	insertedObject.id = results[0][JSON_COLUMN].id

	if (backend.cache) {
		await backend.cache.set(table, insertedObject)
	}

	if (insertedObject.type === 'link') {
		const fn = insertedObject.active ? links.addLink : links.removeLink

		const {
			fromCard,
			toCard
		} = await Bluebird.props({
			fromCard: backend.getElementById(context, insertedObject.data.from.id || insertedObject.data.from, {
				type: insertedObject.data.from.type || insertedObject.data.fromType
			}),
			toCard: backend.getElementById(context, insertedObject.data.to.id || insertedObject.data.to, {
				type: insertedObject.data.to.type || insertedObject.data.toType
			})
		})

		// The reversed array is used so that links are parsed in both directions
		await Bluebird.map([
			[ fromCard, toCard ],
			[ toCard, fromCard ]
		], async (cards) => {
			if (!cards[0] || !cards[1]) {
				return
			}

			const updatedCard = fn(insertedObject, ...cards)

			try {
				await backend.connection.any(`
					UPDATE ${getBucketForType(updatedCard.type)}
						SET ${JSON_COLUMN} = ${JSON_COLUMN} || $1::jsonb
					WHERE id = '${updatedCard.id}';
				`, [
					{
						links: updatedCard.links
					}
				])
			} catch (error) {
				checkUpsertErrors(backend, error, updatedCard)
			}

			if (backend.cache) {
				await backend.cache.unset(updatedCard)
			}
		})
	}

	return insertedObject
}

/*
 * This class implements various low-level methods to interact
 * with cards on PostgreSQL, such as:
 *
 * - Getting cards by their primary keys
 * - Querying a database with JSON Schema
 * - Maintaining and traversing link relationships
 * - Streaming from a database using JSON Schema
 *
 * Notice that at this point we don't have any concepts of
 * permissions. The layers above this class will apply permissions
 * to queries and delegate the fully expanded queries to this
 * class.
 *
 * The main idea is that we will create a set of tables to hold
 * certain types of cards, and their structure will be:
 *
 * ┌─────────┬─────────────┬─────────────────┐
 * │ UUID id │ STRING slug │ JSONB card_data │
 * └─────────┴─────────────┴─────────────────┘
 *
 * In the case of streaming, we will have one stream per card
 * table that is joined into one master stream that reports
 * back inserts and updates on all the tables we're interested
 * in. When the client requests us to open a query stream, then
 * we simply hook it up into the master stream rather than
 * creating new ones all the time.
 */
module.exports = class PostgresBackend {
	/*
	 * The constructor takes:
	 *
	 * - A (probably shared) cache instance that this backend can
	 *   use and maintain to speed up queries.
	 * - A set of rich errors classes the instance can throw
	 * - Various connection options
	 */
	constructor (cache, errors, options) {
		this.cache = cache
		this.errors = errors

		/*
		 * Omit the options that are falsy, like empty strings.
		 */
		this.options = _.omitBy(options, _.isEmpty)

		/*
		 * The PostgreSQL database name that we will connect to.
		 * We don't hardcode it as we want to be able to target
		 * different databases for parallel automated testing
		 * purposes.
		 */
		this.database = options.database.toLowerCase()

		/*
		 * We will use this object to keep track of all the open
		 * streams at any given point. The keys are unique ids for
		 * the streams and the values are the actual stream
		 * instances.
		 * We need to keep track of them so we can close them all
		 * when disconnecting from the database.
		 */
		this.openStreams = {}
	}

	/*
	 * This method should completely destroy the database that
	 * this instance was configured with.
	 */
	async destroy (context) {
		logger.debug(context, 'Deleting database', {
			database: this.database
		})

		/*
		 * The main problem is that we can't delete a database if
		 * its the database the current connection belongs to,
		 * so we need to:
		 *
		 * 1. Disconnect from the database
		 * 2. Create a brand new connection on the default database
		 *    so we can use it to delete the other database
		 * 3. Delete the database
		 * 4. Close the connection we just opened
		 */
		await this.disconnect(context)
		const destroyConnection = pgp(Object.assign({}, this.options, {
			database: 'postgres'
		}))

		await destroyConnection.any(
			`DROP DATABASE IF EXISTS ${this.database};`)
		await destroyConnection.$pool.end()
		await destroyConnection.$destroy()

		/*
		 * Lets also reset the in-memory cache, as it now
		 * contains obsolete information.
		 */
		if (this.cache) {
			await this.cache.reset()
		}
	}

	/*
	 * This method connects the instance to the database. Clients
	 * need to call it before being able to use any other method.
	 * This logic would ideally be in the class constructor, but
	 * its async nature forces us to make it a separate method.
	 *
	 * This method is a bit messy because a Postgres connection is
	 * tied to a particular database. As we don't know if the
	 * database the user specified exists, then we need to:
	 *
	 * 1. Connect to the default "postgres" database
	 * 2. Use that connection to list the available databases
	 *    and potentially create the desired one
	 * 3. Disconnect, and create a new connection to the database
	 *    that we're actually interested in
	 */
	async connect (context) {
		/*
		 * Drop any existing connection so we don't risk having any leaks.
		 */
		await this.disconnect(context)

		/*
		 * Lets connect to the default database, that should always be
		 * available.
		 */
		logger.debug(context, 'Connecting to database', {
			database: this.database
		})
		this.connection = pgp(Object.assign({}, this.options, {
			database: 'postgres'
		}))

		/*
		 * This is an arbitrary request just to make sure that the
		 * connection was made successfully.
		 */
		const {
			version
		} = await this.connection.proc('version')
		logger.info(context, 'Connection to database successful!', {
			version
		})

		/*
		 * List all available databases so we know if we have to
		 * create the one that the client specified or not.
		 *
		 * Notice that the "pg_database" table may contain database
		 * templates, which we are of course not interested in.
		 * See: https://www.postgresql.org/docs/9.3/manage-ag-templatedbs.html
		 */
		logger.debug(context, 'Listing databases')
		const databases = _.map(await this.connection.any(`
			SELECT datname FROM pg_database
			WHERE datistemplate = false;
		`), 'datname')

		/*
		 * Of course, we only want to create the database if it doesn't
		 * exist. Too bad that Postgres doesn't support an "IF NOT EXISTS"
		 * modified on "CREATE DATABASE" so we could avoid these checks.
		 */
		if (!databases.includes(this.database)) {
			logger.debug(context, 'Creating database', {
				database: this.database
			})

			/*
			 * The owner of the database should be the user that the client
			 * specified.
			 *
			 * TODO(jviotti): There is a possible issue where the database
			 * exists, but it was created with another user as an owner. In such
			 * case we would see that the database exists, we would not create
			 * it again, but then we might fail to do the operations we need
			 * because it doesn't belong to us.
			 */
			await this.connection.any(`
				CREATE DATABASE ${this.database} OWNER = ${this.options.user};
			`)

			/*
			 * If the database is fresh, then the in-memory cache should be
			 * as well.
			 */
			if (this.cache) {
				await this.cache.reset()
			}
		}

		/*
		 * At this point we either created the desired database, or
		 * confirmed that it exists, so lets disconnect from the
		 * default database and connect to the one we're interested in.
		 */
		await this.disconnect(context)
		this.connection = pgp(Object.assign({}, this.options, {
			idleTimeoutMillis: 60 * 1000,
			database: this.database
		}))

		/*
		 * We will setup various indexes on all tables to speed up
		 * the most common type of queries that we perform. Most of
		 * the complexity of the following code is because we only
		 * want to create indexes if thet don't exist yet, and we
		 * want to either check for them or create them in parallel
		 * to speed up server boot time.
		 */
		const indexConcurrency = 4
		await Bluebird.map(ALL_BUCKETS, async (table) => {
			/*
			 * Lets use this as an opportunity to also make sure that
			 * the tables we want do exist in the database.
			 * We could extract this into another loop that runs before
			 * this one, but then we'd be looping over the same collection,
			 * so we rather do it here and not loop twice.
			 */
			await this.createTable(context, table)

			logger.debug(context, 'Creating table indexes', {
				table,
				database: this.database
			})

			/*
			 * This query will give us a list of all the indexes
			 * on a particular table.
			 *
			 * TODO(jviotti): We could select all indexes from "pg_indexes"
			 * without filtering by table and keep that as a data structure
			 * that we then use in every iteration of this loop to avoid
			 * having to make queries for the list of indexes multiple times.
			 */
			const indexes = _.map(await this.connection.any(`
				SELECT * FROM pg_indexes WHERE tablename = '${table}'
			`), 'indexname')

			await Bluebird.map(SECONDARY_INDEX, async (secondaryIndex) => {
				/*
				 * This is the actual name of the index that we will create
				 * in Postgres.
				 *
				 * Keep in mind that if you change this, then this code will
				 * not be able to cleanup older indexes with the older
				 * name convention.
				 */
				const fullyQualifiedIndexName = `${secondaryIndex}_${table}_idx`

				/*
				 * Lets not create the index if it already exists.
				 */
				if (indexes.includes(fullyQualifiedIndexName)) {
					return
				}

				logger.debug(context, 'Creating table index', {
					table,
					database: this.database,
					index: secondaryIndex
				})

				/*
				 * This is the point where we actually create the index.
				 * Notice that all these are indexes on fields inside
				 * the column that contains the card JSON contents.
				 *
				 * TODO(jviotti): Why BTREE in particular? How did we
				 * determine that it was the best configuration?
				 */
				await this.connection.any(`
					CREATE INDEX ${fullyQualifiedIndexName} ON ${table}
					USING BTREE ((${JSON_COLUMN}->>'${secondaryIndex}'))
				`)
			}, {
				concurrency: indexConcurrency
			})
		}, {
			concurrency: indexConcurrency
		})

		/*
		 * We will also create a separate special "lock" table
		 * to implement to ".lock()" and ".unlock()" operations.
		 */
		await this.createTable(context, LOCK_TABLE)

		/*
		 * The stream client is an event emitter that broadcasts
		 * changes through the whole database.
		 */
		this.streamClient = await createStreamClient(context, this.connection)
	}

	/*
	 * This method takes care of gracefully disconnecting from
	 * Postgres, and its mainly used during automated testing.
	 */
	async disconnect (context) {
		/*
		 * 1. Loop over the open streams, close them, and remove
		 * any references to them.
		 */
		for (const [ id, stream ] of Object.entries(this.openStreams)) {
			logger.debug(context, 'Disconnecting stream', id)
			await stream.close()
			Reflect.deleteProperty(this.openStreams, id)
		}

		/*
		 * 2. Close the master stream.
		 */
		if (this.streamClient) {
			await this.streamClient.close()
			this.streamClient = null
		}

		/*
		 * 3. Close the main connection pool.
		 */
		if (this.connection) {
			logger.debug(context, 'Disconnecting from database', {
				database: this.database
			})

			await this.connection.$pool.end()
			await this.connection.$destroy()
			this.connection = null
		}
	}

	/*
	 * Get all the user tables in the database.
	 */
	async getTables (context) {
		logger.debug(context, 'Listing tables', {
			database: this.database
		})

		/*
		 * Notice we skip internal databases such as "pg_catalog".
		 */
		const results = await this.connection.any(`
			SELECT * FROM pg_catalog.pg_tables
			WHERE schemaname != 'pg_catalog' AND
			      schemaname != 'information_schema';`)

		return _.map(results, 'tablename')
	}

	/*
	 * Check if the database has a certain table.
	 */
	async hasTable (context, name) {
		const tables = await this.getTables(context)
		return tables.includes(name)
	}

	/*
	 * Create a new table in the database the client
	 * configured the backend with.
	 */
	async createTable (context, name) {
		logger.debug(context, 'Creating table', {
			table: name,
			database: this.database
		})

		/*
		 * Create the table if it doesn't exist.
		 *
		 * TODO(jviotti): Keep in mind that if we change
		 * this structure and deploy to production, then
		 * the new structure won't be applied, as we would
		 * see that the table already exists and move
		 * one without applying the changes.
		 */
		await this.connection.any(`
			CREATE TABLE IF NOT EXISTS ${name} (
				id VARCHAR (255) PRIMARY KEY NOT NULL,
				slug VARCHAR (255) UNIQUE NOT NULL,
				type VARCHAR (255) NOT NULL,
				${JSON_COLUMN} jsonb)`)
	}

	/*
	 * Insert a card to the database, and throw an error
	 * if a card with the same id or slug already exists.
	 */
	async insertElement (context, object) {
		return upsertObject(context, this, object, {
			replace: false
		})
	}

	/*
	 * Insert a card to the database, or replace it
	 * if a card with the same id or slug already exists.
	 */
	async upsertElement (context, object) {
		return upsertObject(context, this, object, {
			replace: true
		})
	}

	/*
	 * Get a card from the database by id and table.
	 */
	async getElementById (context, id, options = {}) {
		/*
		 * For performance reasons, we require clients
		 * to already know in advance the type of the card.
		 * Turns out we know this pretty much every time
		 * in practice.
		 */
		if (!options.type) {
			throw new this.errors.JellyfishNoIdentifier(
				`No type when getting element by id: ${id}`)
		}

		/*
		 * Get the element's table based on its type.
		 */
		const table = getBucketForType(options.type)

		/*
		 * Lets first check the in-memory cache so we can avoid
		 * making a full-blown query to the database.
		 */
		if (this.cache) {
			const cacheResult = await this.cache.getById(table, id)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		/*
		 * Make a database request if we didn't have luck with
		 * the cache.
		 */
		const result = await getElementByIdFromTable(context, this, table, id)

		if (this.cache) {
			if (result) {
				/*
				 * If we found the element, then update the cache
				 * so we can fetch it from there next time.
				 */
				await this.cache.set(table, result)
			} else {
				/*
				 * If we didn't, then let the cache know that this
				 * id doesn't exist on that table, so that we can
				 * also avoid another query in vain in the future.
				 */
				await this.cache.setMissingId(table, id)
			}
		}

		return result
	}

	/*
	 * Get a card from the database by slug and table.
	 */
	async getElementBySlug (context, slug, options = {}) {
		/*
		 * For performance reasons, we require clients
		 * to already know in advance the type of the card.
		 * Turns out we know this pretty much every time
		 * in practice.
		 */
		if (!options.type) {
			throw new this.errors.JellyfishNoIdentifier(
				`No type when getting element by slug: ${slug}`)
		}

		/*
		 * Get the element's table based on its type.
		 */
		const table = getBucketForType(options.type)

		/*
		 * Lets first check the in-memory cache so we can avoid
		 * making a full-blown query to the database.
		 */
		if (this.cache) {
			const cacheResult = await this.cache.getBySlug(table, slug)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		/*
		 * Make a database request if we didn't have luck with
		 * the cache.
		 */
		const result = await getElementBySlugFromTable(context, this, table, slug)

		if (this.cache) {
			if (result) {
				/*
				 * If we found the element, then update the cache
				 * so we can fetch it from there next time.
				 */
				await this.cache.set(table, result)
			} else {
				/*
				 * If we didn't, then let the cache know that this
				 * id doesn't exist on that table, so that we can
				 * also avoid another query in vain in the future.
				 */
				await this.cache.setMissingSlug(table, slug)
			}
		}

		return result
	}

	/*
	 * Get a set of cards by id from a single table in one shot.
	 */
	async getElementsById (context, ids, options) {
		if (!options.type) {
			throw new this.errors.JellyfishNoIdentifier(
				`No type when getting elements by id: ${ids}`)
		}

		/*
		 * There is no point making a query if the set of ids
		 * is empty.
		 */
		if (ids.length === 0) {
			return []
		}

		/*
		 * Get the element's table based on its type.
		 */
		const table = getBucketForType(options.type)

		/*
		 * Consider that some of the ids the client is requesting
		 * might be on the in-memory cache but some might not.
		 * We want to use the in-memory cache as much as can, so
		 * we have to do some acrobatics to figure out what are
		 * the elements that we will require from the cache and
		 * which ones we will request the database from.
		 */
		const cached = []
		const uncached = this.cache ? [] : ids
		const uncachedSet = this.cache ? new Set() : new Set(ids)

		/*
		 * First lets find out which of the ids are in the
		 * in-memory cache.
		 */
		if (this.cache) {
			for (const id of ids) {
				const cacheResult = await this.cache.getById(table, id)
				if (cacheResult.hit) {
					/*
					 * If the cache knows about the id and it indeed exists,
					 * then save it so we return it right away.
					 *
					 * Notice that we don't do anything if the cache knows
					 * that such id is not in the database, as we don't want
					 * to query for it in vain, and we would ignore it from
					 * the resulting array anyways.
					 */
					if (cacheResult.element) {
						cached.push(cacheResult.element)
					}
				} else {
					/*
					 * Put the id in the uncached bucket if the
					 * in-memory cache doesn't know about it
					 */
					uncached.push(id)
					uncachedSet.add(id)
				}
			}
		}

		/*
		 * This means all the requested ids were in the in-memory
		 * cache, so we can just return them.
		 */
		if (uncached.length === 0) {
			return cached
		}

		/*
		 * There are at least some elements that we must request,
		 * so lets ask the database for them.
		 */
		const elements = await getElementsByIdFromTable(
			context, this, table, uncached)

		if (this.cache) {
			/*
			 * Store the ones we found in the in-memory cache.
			 */
			for (const element of elements) {
				await this.cache.set(table, element)
				uncachedSet.delete(element.id)
			}

			/*
			 * Let the in-memory cache know about the ids that
			 * we know for sure don't exist in the requested
			 * table.
			 */
			for (const id of uncachedSet) {
				await this.cache.setMissingId(table, id)
			}
		}

		return elements.concat(cached)
	}

	/*
	 * Query the database using JSON Schema.
	 * We do this in two different ways:
	 *
	 * - Pass the JSON Schema to our JSON Schema to SQL translator
	 *
	 * - Try to be clever and analyze simple schemas to infer what
	 *   they are about and construct more customised queries for
	 *   them for performance reasons
	 */
	async query (context, schema, options = {}) {
		const realSchema = defaultAdditionalPropertiesFalse(schema)

		/*
		 * This optimisation is for queries that request a single element
		 * by type that don't contain a certain type of link.
		 */
		if (options.limit === 1 &&
				realSchema.$$links &&
				Object.keys(realSchema.properties).length === 1 &&
				realSchema.properties.type &&
				realSchema.properties.type.const) {
			const linkProperties = Object.keys(realSchema.$$links)
			if (linkProperties.length === 1 &&
				!realSchema.$$links[linkProperties[0]]) {
				const results = await this.connection.any(
					`SELECT * FROM ${getBucketForType(realSchema.properties.type.const)}
					WHERE ${JSON_COLUMN}->>'type' = $1
					AND
						${JSON_COLUMN}->'links'->>$2 IS NULL
					OFFSET $3
					LIMIT 1`,
					[
						realSchema.properties.type.const,
						linkProperties[0],
						options.skip || 0
					]
				)

				return _.map(results, JSON_COLUMN)
			}
		}

		/*
		 * There are a bunch of optimisations we can try for schemas
		 * that request a single element by id or by slug.
		 */
		if (realSchema.properties &&
			(
				(realSchema.properties.id && realSchema.properties.id.const) ||
				(realSchema.properties.slug && realSchema.properties.slug.const)
			)
		) {
			/*
			 * If the client request nothing, by a weird combination of
			 * skip/limit, then we will just give them nothing.
			 */
			if (options.skip || options.limit === 0) {
				return []
			}

			/*
			 * Find what the type of the element we're requesting is. Not
			 * having this information is bad, as we would have to iterate
			 * through all the tables to try to find it, so we will also
			 * make some noise about it.
			 */
			const type = realSchema.properties.type &&
				realSchema.properties.type.const
			if (!type) {
				logger.warn(context, 'Unspecified type in query for constant id/slug', {
					schema: realSchema,
					database: this.database
				})
			}

			/*
			 * If we know the type of the element we want to find, then we
			 * can do a direct query to the specific table, otherwise we
			 * will have to ask all the tables, and see what happens.
			 */
			let element = null
			if (realSchema.properties.id && realSchema.properties.id.const) {
				if (type) {
					element = await this.getElementById(
						context, realSchema.properties.id.const, {
							type
						})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementByIdFromTable(
							context, this, table, realSchema.properties.id.const)
						if (element) {
							break
						}
					}
				}
			} else if (realSchema.properties.slug && realSchema.properties.slug.const) {
				if (type) {
					element = await this.getElementBySlug(
						context, realSchema.properties.slug.const, {
							type
						})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementBySlugFromTable(
							context, this, table, realSchema.properties.slug.const)
						if (element) {
							break
						}
					}
				}
			}

			/*
			 * This means that we didn't find anything.
			 */
			if (!element) {
				return []
			}

			/*
			 * Ignore a found element if its type doesn't really match.
			 */
			if (type && element.type !== type) {
				return []
			}

			/*
			 * This is an optimisation for when we are particularly
			 * interested on the "active" field.
			 * If we found an element, we can compare the booleans
			 * directly and return early if there is a mismatch.
			 */
			if (realSchema.properties.active &&
				_.isBoolean(realSchema.properties.active.const) &&
				element.active !== realSchema.properties.active.const) {
				return []
			}

			/*
			 * Resolve the element's links, if any, and match it against
			 * the schema to resolve any other requirement from the schema.
			 */
			const elementWithLinks = await resolveLinks(
				context, this, realSchema, options, _.cloneDeep(element))
			return _.compact([ filter(realSchema, elementWithLinks) ])
		}

		const sortExpression = realSchema[SORT_KEY]

		/*
		 * Get the tables that we must query with the schema.
		 * Hopefully these are a subset of all tables.
		 */
		const tables = getBucketsForSchema(realSchema)

		/*
		 * We can avoid looping if we know its only one table.
		 */
		if (tables.length === 1) {
			const results = await queryTable(
				context, this, tables[0], realSchema, options)
			return sortExpression
				? jellyscript.sort(results, sortExpression)
				: results
		}

		logger.warn(context, 'Looping through all tables to execute a query', {
			database: this.database
		})

		/*
		 * Concurrently query all tables and join the results.
		 */
		const items = _.flatten(await Bluebird.map(tables, (table) => {
			return queryTable(context, this, table, realSchema, options)
		}, {
			concurrency: 3
		}))
		return sortExpression
			? jellyscript.sort(items, sortExpression)
			: items
	}

	/*
	 * Stream changes to the database that match a certain JSON Schema.
	 *
	 * This method returns an event emitter instance that emits the
	 * following events:
	 *
   * - data: When there is a change
   * - error: When there is an error
   * - closed: When the connection is closed after calling `.close()`
	 *
	 * The "data" event has an object payload with the following properties:
	 *
	 * - before: The past state of the card (might be null)
	 * - after: The present state of the card
	 * - type: The type of change, which can be "insert" or "update"
	 *
	 * The event emitter has a `.close()` method that clients should
	 * use to gracefully close the stream once its not needed anymore.
	 *
	 * In order to implement this feature, we will tap into the master
	 * stream and resolve links and JSON Schema filtering client side.
	 */
	async stream (context, querySchema) {
		const schema = defaultAdditionalPropertiesFalse(querySchema)
		const tables = getBucketsForSchema(schema)

		/*
		 * We first make sure that the schema is valid.
		 */
		skhema.validate(schema, null, {
			schemaOnly: true
		})

		/*
		 * Make some noise if we know that the client schema
		 * requires us to look at more than one table.
		 */
		if (tables.length > 1) {
			logger.warn(context, 'Looping through all tables to execute a stream', {
				database: this.database
			})
		} else {
			logger.debug(context, 'Streaming from table', {
				tables,
				database: this.database
			})
		}

		/*
		 * Create a new emitter instance and register it in the
		 * list of opens stream the instance keeps track of.
		 */
		const emitter = new EventEmitter()
		emitter.id = uuid()
		this.openStreams[emitter.id] = emitter

		const changeHandler = async (change) => {
			const {
				before,
				after
			} = change

			if (!_.includes(tables, change.table)) {
				return
			}

			let newMatch = filter(schema, _.get(after, [ JSON_COLUMN ], null))
			let oldMatch = filter(schema, _.get(before, [ JSON_COLUMN ], null))

			if (_.isEmpty(newMatch)) {
				newMatch = null
			}
			if (_.isEmpty(oldMatch)) {
				oldMatch = null
			}

			if (newMatch) {
				newMatch = await resolveLinks(context, this, schema, {}, newMatch)
			}

			if (oldMatch) {
				oldMatch = await resolveLinks(context, this, schema, {}, oldMatch)
			}

			if (newMatch || oldMatch) {
				emitter.emit('data', {
					type: change.type.toLowerCase(),
					before: oldMatch,
					after: newMatch
				})
			}
		}

		const errorHandler = (error) => {
			emitter.emit('error', error)
		}

		this.streamClient.on('change', changeHandler)

		/*
		 * Propagate errors coming from the master stream.
		 */
		this.streamClient.on('error', errorHandler)

		emitter.close = async () => {
			logger.debug(context, 'Closing stream', {
				tables,
				database: this.database
			})

			/*
			 * Remove all the listeners we added.
			 */
			this.streamClient.removeListener('change', changeHandler)
			this.streamClient.removeListener('error', errorHandler)

			/*
			 * Delete the emitter from the set of open streams.
			 */
			Reflect.deleteProperty(this.openStreams, emitter.id)

			/*
			 * Notify the client that the stream was successfully closed.
			 */
			emitter.emit('closed')

			logger.debug(context, 'Stream closed', {
				tables,
				database: this.database
			})
		}

		return emitter
	}

	/*
	 * Returns a free form object with information about
	 * this backend instance.
	 */
	// eslint-disable-next-line class-methods-use-this
	async getStatus () {
		/*
		 * TODO(jviotti): We should put something interesting here.
		 */
		return {}
	}

	/*
	 * Acquire a exclusive lock over a slug given a session/actor.
	 *
	 * We implement exclusive locks by operating on a special "locks"
	 * table, and relying on atomic inserts.
	 *
	 * This method returns the owner if the locking succeeded.
	 */
	async lock (owner, slug) {
		const payload = {
			slug,
			owner,
			timestamp: (new Date()).toISOString()
		}

		try {
			// Insert is guaranteed to be atomic. If two nodes
			// try to insert the same lock, then only one can succeed.
			const result = await this.connection.one(`
				INSERT INTO ${LOCK_TABLE} VALUES ($1, $2, $3, $4)
				ON CONFLICT (slug)
				DO UPDATE
					SET slug = EXCLUDED.slug
				RETURNING *
			`, [
				uuid(),
				slug,
				'lock',
				payload
			])

			if (owner === result[JSON_COLUMN].owner) {
				return slug
			}
		} catch (error) {
			throw new this.errors.JellyfishDatabaseError(error)
		}

		// Lock failed
		return null
	}

	/*
	 * Release an exclusive lock on a slug given a session/actor.
	 *
	 * This method will return the slug if unblocking succeeded, which
	 * implies the calleer really owned the lock on the first place.
	 */
	async unlock (owner, slug) {
		try {
			const result = await this.connection.result(`
				DELETE FROM ${LOCK_TABLE}
				WHERE slug = '${slug}'
				AND ${JSON_COLUMN}->>'owner' = '${owner}'`)
			if (result.rowCount === 0) {
				return null
			}
		} catch (error) {
			throw new this.errors.JellyfishDatabaseError(error)
		}

		return slug
	}
}
