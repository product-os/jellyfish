/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const rethinkdb = require('rebirthdb-js')
const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const logger = require('../logger').getLogger(__filename)
const Bluebird = require('bluebird')
const reqlSchema = require('reql-schema')
const skhema = require('skhema')
const uuid = require('uuid/v4')
const jellyscript = require('../jellyscript')
const assert = require('./assert')
const errors = require('./errors')
const links = require('./links')

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

const getSecondaryIndexesForQuery = _.once(() => {
	const indexes = {}
	for (const secondIdx of SECONDARY_INDEX) {
		indexes[secondIdx] = {}
	}
	return indexes
})

const generateRethinkInstance = (context, options) => {
	return rethinkdb(_.merge({
		pool: true,
		cursor: false,
		optionalRun: false,
		timeout: 50,
		silent: true,
		log: (message) => {
			logger.debug(context, 'RethinkDB Dash', {
				message
			})
		}
	}, options))
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
	}

	emitter.close = async () => {
		for (const value of Object.values(streams)) {
			await value.close()
		}
	}

	return emitter
}

const createTableStream = async (context, backend, table, schema) => {
	skhema.validate(schema, null, {
		schemaOnly: true
	})

	const emitter = new EventEmitter()

	logger.debug(context, 'Streaming from table', {
		table,
		database: backend.database
	})

	const cursor = await backend.reqlSchemaStreams(backend.database, table, schema, {
		indexes: getSecondaryIndexesForQuery()
	}).changes()
		.run({
			cursor: true
		})

	emitter.close = async () => {
		logger.debug(context, 'Closing stream', {
			table,
			database: backend.database
		})

		return new Bluebird((resolve) => {
			cursor.close(() => {
				emitter.emit('closed')

				logger.debug(context, 'Stream closed', {
					table,
					database: backend.database
				})

				resolve()
			})
		})
	}

	cursor.each(async (error, change) => {
		if (error) {
			emitter.emit('error', error)
			await emitter.close()

			return
		}

		let newMatch = filter(schema, change.new_val)
		let oldMatch = filter(schema, change.old_val)

		if (newMatch) {
			newMatch = await resolveLinks(context, backend, schema, {}, newMatch)
		}

		if (oldMatch) {
			oldMatch = await resolveLinks(context, backend, schema, {}, oldMatch)
		}

		if (newMatch || oldMatch) {
			emitter.emit('data', {
				before: change.old_val
					? oldMatch || {}
					: null,
				after: change.new_val
					? newMatch || {}
					: null
			})
		}
	})

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

	let query = backend.reqlSchema(backend.database, table, schema, {
		indexes: getSecondaryIndexesForQuery()
	})

	if (options.sortBy) {
		let rethinkRowSelector = backend.connection.row

		for (const key of _.castArray(options.sortBy)) {
			rethinkRowSelector = rethinkRowSelector(key)
		}

		// The r.orderBy() function defaults to ascending, so it only needs to be
		// modified if the direction is explicitly 'desc'
		if (options.sortDir === 'desc') {
			rethinkRowSelector = backend.connection.desc(rethinkRowSelector)
		}

		query = query.orderBy(rethinkRowSelector)
	} else {
		// Default to sorting by timestamp
		query = query.orderBy(backend.connection.row('data')('timestamp'))
	}

	if (options.skip) {
		query = query.skip(options.skip)
	}

	const cursor = await query.run()
	const elements = await Bluebird.map(cursor, async (card) => {
		return resolveLinks(context, backend, schema, options, card)
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

	return backend.connection
		.db(backend.database)
		.table(table)
		.getAll(...ids, {
			index: 'id'
		})
		.run()
}

const getElementByIdFromTable = async (context, backend, table, id) => {
	logger.debug(context, 'Getting element by id', {
		id,
		table,
		database: backend.database
	})

	let result = null

	try {
		const matches = await backend.connection
			.db(backend.database)
			.table(table)
			.getAll(id, {
				index: 'id'
			})
			.limit(1)
			.run()

		if (!_.isEmpty(matches)) {
			result = _.first(matches)
		}
	} catch (error) {
		if (error.name !== 'ReqlOpFailedError' ||
				error.msg !== `Table \`${backend.database}.${table}\` does not exist.`) {
			throw error
		}
	}

	return result
}

const getElementBySlugFromTable = async (context, backend, table, slug) => {
	logger.debug(context, 'Getting element by slug', {
		slug,
		table,
		database: backend.database
	})

	let result = null

	try {
		result = await backend.connection
			.db(backend.database)
			.table(table)
			.get(slug)
			.run()
	} catch (error) {
		if (error.name !== 'ReqlOpFailedError' ||
				error.msg !== `Table \`${backend.database}.${table}\` does not exist.`) {
			throw error
		}
	}

	return result
}

const getTablesSafe = async (connection, database, retries = 10) => {
	if (retries === 0) {
		throw new errors.JellyfishDatabaseError('Could not get tables after multiple retries')
	}

	try {
		return await connection
			.db(database)
			.tableList()
			.run()
	} catch (error) {
		if (error.name === 'ReqlOpFailedError' &&
				error.msg === `Database \`${database}\` does not exist.`) {
			await Bluebird.delay(100)
			return getTablesSafe(connection, database, retries - 1)
		}

		throw error
	}
}

const createTableSafe = async (connection, database, name, retries = 10) => {
	if (retries === 0) {
		throw new errors.JellyfishDatabaseError(
			`Could not create table ${name} after multiple retries`)
	}

	try {
		return await connection
			.db(database)
			.tableCreate(name, {
				primaryKey: 'slug'
			})
			.run()
	} catch (error) {
		if (error.name === 'ReqlOpFailedError' &&
				error.msg === `Database \`${database}\` does not exist.`) {
			await Bluebird.delay(100)
			return createTableSafe(connection, database, name, retries - 1)
		}

		throw error
	}
}
const upsertObject = async (context, backend, table, object, options) => {
	if (!object.slug) {
		throw new errors.JellyfishDatabaseError('Missing primary key')
	}

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

	// Its very important, for concurrency issues, that inserts/upserts
	// remain atomic, in that there is only one atomic request sent to
	// the database. We were previously violating this principle by
	// querying the database before proceeding with the insertion.
	const results = options.replace
		? await backend.connection
			.db(backend.database)
			.table(table)
			.get(insertedObject.slug)
			.replace((element) => {
				return backend.connection.branch(
					element.eq(null),
					backend.connection.expr(insertedObject).merge({
						id: backend.connection.literal(elementId)
					}),
					backend.connection.expr(insertedObject).merge({
						id: element('id')
					}))
			}, {
				returnChanges: 'always'
			})
			.run()
		: await backend.connection
			.db(backend.database)
			.table(table)
			.insert(Object.assign(insertedObject, {
				id: elementId
			}), {
				returnChanges: true
			})
			.run()

	if (results.errors !== 0) {
		if (/^Primary key too long/.test(results.first_error)) {
			throw new errors.JellyfishInvalidSlug(
				`The primary key is too long: ${object.slug}`)
		}

		if (/^Duplicate primary key/.test(results.first_error) ||
				/^Primary key/.test(results.first_error)) {
			throw new errors.JellyfishElementAlreadyExists(
				`There is already an element with slug ${object.slug}`)
		}

		throw new errors.JellyfishDatabaseError(results.first_error)
	}

	if (results.changes &&
			results.changes[0] &&
			results.changes[0].new_val) {
		insertedObject.id = results.changes[0].new_val.id
	} else {
		insertedObject.id = elementId
	}

	if (backend.cache) {
		if (options.unsetFromCache) {
			await backend.cache.unset(insertedObject)
		}

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

			await upsertObject(context, backend, getBucketForType(updatedCard.type), updatedCard, {
				replace: true,
				unsetFromCache: true
			})
		})
	}

	return insertedObject
}

// Wait for database creation, gives up after a passed number of iterations
// This should be used after a dbCreate() to make sure the database actually exists,
const waitForDBCreation = async (backend, database, attempts = 10) => {
	if (attempts === 0) {
		throw new Error(`Reached max attempts while waiting for database creation. ${database}`)
	}
	const databases = await backend
		.dbList()
		.run()

	if (databases.includes(database)) {
		try {
			await backend.db(database).tableList().run()
		} catch (error) {
			// Looks like the RethinkDB driver might still fail with a
			// "does not exist" error even if the database was returned
			// by `.dbList()`. Trying to run an actual query should do.
			// See https://circleci.com/gh/balena-io/jellyfish/4352
			if (error.name === 'ReqlOpFailedError' &&
					error.msg === `Database \`${database}\` does not exist.`) {
				await Bluebird.delay(100)
				await waitForDBCreation(backend, database, attempts - 1)
				return
			}

			throw error
		}

		return
	}

	await Bluebird.delay(50)

	await waitForDBCreation(backend, database, attempts - 1)
}

module.exports = class Backend {
	/**
   * @summary The Jellyfish Backend
   * @class
   * @public
   *
	 * @param {Object} cache - cache
   * @param {Object} options - options
   * @param {String} options.database - database name
   * @param {String} options.host - database host
   * @param {Number} options.port - database port
   * @param {String} [options.user] - database user
   * @param {String} [options.password] - database password
   * @param {String} [options.certificate] - database SSL certificate
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, {
   *   database: 'my-jellyfish',
   *   host: 'localhost',
   *   port: 28015,
   *   user: 'admin',
   *   password: 'secret'
   * })
   */
	constructor (cache, options) {
		this.options = _.omitBy({
			host: options.host,
			port: options.port,
			user: options.user,
			password: options.password,
			buffer: options.buffer,
			max: options.max
		}, _.isEmpty)

		if (options.certificate) {
			this.options.ssl = {
				ca: Buffer.from(options.certificate)
			}
		}

		this.database = options.database
		this.cache = cache

		this.openStreams = {}
	}

	/**
   * @summary Reset the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
	 *
   * @description
   * For testing purposes.
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.connection.reset()
   */
	async reset (context) {
		const tables = await this.getTables()
		await Promise.all(tables.map((table) => {
			logger.debug(context, 'Dropping table', {
				table,
				database: this.database
			})

			return this.connection
				.db(this.database)
				.tableDrop(table)
				.run()
		}))

		if (this.cache) {
			await this.cache.reset()
		}
	}

	/**
   * @summary Destroy the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
	 *
   * @description
   * For testing purposes.
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.destroy()
   */
	async destroy (context) {
		if (this.cache) {
			await this.cache.reset()
		}

		await this.disconnect(context)

		// Create a rethinkdb instance with no connection pooling to
		// drop the database
		const rethinkInstance = await generateRethinkInstance(context, {
			pool: false
		})

		const connection = await rethinkInstance.connect(this.options)

		logger.debug(context, 'Dropping database', {
			database: this.database
		})

		await rethinkInstance.dbDrop(this.database).run(connection)
		logger.debug(context, 'Database dropped', {
			database: this.database
		})
		await connection.close()
	}

	/**
   * @summary Connect to the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
	 *
   * @description
   * You need to call this method before being able
   * to call any of the other ones.
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   */
	async connect (context) {
		if (!this.connection) {
			logger.debug(context, 'Connecting to database', {
				database: this.database
			})

			// We create two connection pools, one will be used exclusively for streams
			// while the other will handle other request.
			// This is required because every stream query may listen for changes on
			// all the available buckets, which will quickly fill the pool with open
			// connections that can not be released
			this.connection = generateRethinkInstance(context, this.options)
			this.streamConnection = generateRethinkInstance(context, this.options)
			this.reqlSchema = reqlSchema(this.connection)
			this.reqlSchemaStreams = reqlSchema(this.streamConnection)
		}
		logger.debug(context, 'Listing databases')
		const databases = await this.connection
			.dbList()
			.run()

		if (!databases.includes(this.database)) {
			if (this.cache) {
				await this.cache.reset()
			}

			logger.debug(context, 'Creating database', {
				database: this.database
			})

			await this.connection
				.dbCreate(this.database)
				.run()

			// If we created the database add a delay, otherwise the next wait()
			// might fail with `Database does not exist`
			await waitForDBCreation(this.connection, this.database)
		}

		logger.debug(context, 'Waiting for database', {
			database: this.database
		})

		// Prevent sporadic replica error:
		//   Cannot perform read: primary replica for shard ["", +inf) not available]
		// See https://github.com/rethinkdb/rethinkdb/issues/6160
		await waitForDBCreation(this.connection, this.database)

		for (const table of await this.getTables(context)) {
			logger.debug(context, 'Checking table for stale indexes', {
				table,
				database: this.database
			})

			// Get rid of old indexes, so we can be sure
			// they get re-created every time the server
			// restarts, to accomodate for updates, etc.
			const indexes = await this.connection
				.db(this.database)
				.table(table)
				.indexList()
				.run()
			for (const index of indexes) {
				if (!_.includes(SECONDARY_INDEX, index)) {
					logger.debug(context, 'Dropping stale table index', {
						table,
						database: this.database,
						index
					})

					await this.connnection
						.db(this.database)
						.table(table)
						.indexDrop(index)
						.run()
				}
			}
		}

		const indexConcurrency = 4

		await Bluebird.map(ALL_BUCKETS, async (table) => {
			await this.createTable(context, table)

			logger.debug(context, 'Creating table indexes', {
				table,
				database: this.database
			})

			const indexes = await this.connection
				.db(this.database)
				.table(table)
				.indexList()
				.run()

			await Bluebird.map(SECONDARY_INDEX, async (secondaryIndex) => {
				if (_.includes(indexes, secondaryIndex)) {
					return
				}

				logger.debug(context, 'Creating table index', {
					table,
					database: this.database,
					index: secondaryIndex
				})

				await this.connection
					.db(this.database)
					.table(table)
					.indexCreate(secondaryIndex)
					.run()

				logger.debug(context, 'Waiting for table indexes', {
					table,
					database: this.database
				})

				// Wait for all indexes to be ready
				await this.connection
					.db(this.database)
					.table(table)
					.indexWait()
					.run()
			}, {
				concurrency: indexConcurrency
			})
		}, {
			concurrency: indexConcurrency
		})

		await this.createTable(context, LOCK_TABLE)
	}

	/**
   * @summary Disconnect from the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
	 *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.disconnect()
   */
	async disconnect (context) {
		const {
			connection,
			streamConnection
		} = this
		if (streamConnection) {
			for (const [ id, stream ] of Object.entries(this.openStreams)) {
				logger.debug(context, 'Disconnecting stream', id)
				await stream.close()
				Reflect.deleteProperty(this.openStreams, id)
			}

			await streamConnection.getPoolMaster().drain()
			this.reqlSchemaStreams = null
			this.streamConnection = null
		}
		if (connection) {
			logger.debug(context, 'Disconnecting from database', {
				database: this.database
			})

			await connection.getPoolMaster().drain()
			this.reqlSchema = null
			this.connection = null
		}
	}

	/**
   * @summary Get the list of tables in the database
   * @function
   * @private
   *
	 * @param {Object} context - execution context
	 *
   * @returns {String[]} tables
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
	 *
	 * const tables = await backend.getTables()
	 *
	 * for (const table of tables) {
	 *   console.log(table)
	 * }
   */
	async getTables (context) {
		logger.debug(context, 'Listing tables', {
			database: this.database
		})

		return getTablesSafe(this.connection, this.database)
	}

	/**
   * @summary Check if the database has a certain table
   * @function
   * @private
   *
	 * @param {Object} context - execution context
   * @param {String} name - table name
   * @returns {Boolean} whether the table exists
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * if (backend.hasTable('foo')) {
   *   console.log('The database has a table called foo')
   * }
   */
	async hasTable (context, name) {
		const tables = await this.getTables(context)
		return tables.includes(name)
	}

	/**
   * @summary Create a table in the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
   * @param {String} name - table name
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * await backend.createTable('foo')
   */
	async createTable (context, name) {
		if (!await this.hasTable(context, name)) {
			logger.debug(context, 'Creating table', {
				table: name,
				database: this.database
			})

			await createTableSafe(this.connection, this.database, name)
			logger.debug(context, 'Waiting for table', {
				table: name,
				database: this.database
			})

			// Lets make sure the table is ready before continuing
			await this.connection
				.db(this.database)
				.table(name)
				.wait()
				.run()
		}
	}

	/**
   * @summary Insert an element to the database
   * @function
   * @public
   *
   * @description
   * This function will throw if the element already exists.
   *
	 * @param {Object} context - execution context
   * @param {Object} object - the object element
   * @returns {Object} inserted element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const object = await backend.insertElement({
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async insertElement (context, object) {
		const table = getBucketForType(object.type)
		return upsertObject(context, this, table, object, {
			unsetFromCache: true,
			replace: false
		})
	}

	/**
   * @summary Insert or update an element from the database
   * @function
   * @public
   *
	 * @param {Object} context - execution context
   * @param {Object} object - the object element
   * @returns {Object} upserted element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const object = await backend.upsertElement({
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async upsertElement (context, object) {
		const table = getBucketForType(object.type)
		return upsertObject(context, this, table, object, {
			unsetFromCache: false,
			replace: true
		})
	}

	/**
   * @summary Get an element from the database by id
   * @function
   * @private
   *
	 * @param {Object} context - execution context
   * @param {String} id - id
	 * @param {Object} options - options
	 * @param {String} options.type - element type
   * @returns {(Object|Null)} element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement({
   *   data: 'foo'
   * })
   *
	 * const element = await backend.getElementById(id, {
	 *   type: 'card'
	 * })
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementById (context, id, options = {}) {
		if (!options.type) {
			throw new errors.JellyfishNoIdentifier(`No type when getting element by id: ${id}`)
		}

		const table = getBucketForType(options.type)

		if (this.cache) {
			const cacheResult = await this.cache.getById(table, id)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		const result = await getElementByIdFromTable(context, this, table, id)

		if (this.cache) {
			if (result) {
				await this.cache.set(table, result)
			} else {
				await this.cache.setMissingId(table, id)
			}
		}

		return result
	}

	/**
   * @summary Get a set of elements from the database by ids
   * @function
   * @private
   *
	 * @param {Object} context - execution context
   * @param {String[]} ids - ids
	 * @param {Object} options - options
	 * @param {String[]} options.types - element types
   * @returns {Object[]} elements
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement({
   *   data: 'foo'
   * })
   *
	 * const elements = await backend.getElementsById([ id ], {
	 *   type: 'card'
	 * })
   *
   * console.log(elements[0].data)
   * > 'foo'
   */
	async getElementsById (context, ids, options) {
		if (!options.type) {
			throw new errors.JellyfishNoIdentifier(`No types when getting elements by id: ${ids}`)
		}

		if (ids.length === 0) {
			return []
		}

		const table = getBucketForType(options.type)
		const cached = []
		const uncached = this.cache ? [] : ids
		const uncachedSet = this.cache ? new Set() : new Set(ids)

		if (this.cache) {
			for (const id of ids) {
				const cacheResult = await this.cache.getById(table, id)
				if (cacheResult.hit) {
					if (cacheResult.element) {
						cached.push(cacheResult.element)
					}
				} else {
					uncached.push(id)
					uncachedSet.add(id)
				}
			}
		}

		if (uncached.length === 0) {
			return cached
		}

		const elements = await getElementsByIdFromTable(context, this, table, uncached)

		if (this.cache) {
			for (const element of elements) {
				await this.cache.set(table, element)
				uncachedSet.delete(element.id)
			}

			for (const id of uncachedSet) {
				await this.cache.setMissingId(table, id)
			}
		}

		return elements.concat(cached)
	}

	/**
   * @summary Get an element from the database by a slug
   * @function
   * @private
   *
	 * @param {Object} context - execution context
   * @param {String} slug - slug
	 * @param {Object} options - options
	 * @param {String} options.type - element type
   * @returns {(Object|Null)} element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * await backend.insertElement({
   *   slug: 'hello',
   *   data: 'foo'
   * })
   *
	 * const element = await backend.getElementBySlug('hello', {
	 *   type: 'card'
	 * })
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementBySlug (context, slug, options = {}) {
		if (!options.type) {
			throw new errors.JellyfishNoIdentifier(`No type when getting element by slug: ${slug}`)
		}

		const table = getBucketForType(options.type)

		if (this.cache) {
			const cacheResult = await this.cache.getBySlug(table, slug)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		const result = await getElementBySlugFromTable(context, this, table, slug)

		if (this.cache) {
			if (result) {
				await this.cache.set(table, result)
			} else {
				await this.cache.setMissingSlug(table, slug)
			}
		}

		return result
	}

	/**
   * @summary Query a table using JSON Schema
   * @function
   * @public
   *
	 * @param {Object} context - execution context
   * @param {Object} querySchema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Number} [options.limit] - limit
	 * @param {Number} [options.skip] - skip
	 * @param {String | String[]} [options.sortBy] - Key or key path as an array to
	 *   a value that the query should be sorted by
	 * @param {'asc' | 'desc'} [options.sortDir] - Set sort direction,
	 *   defaults to asc (ascending)
	 * @param {Function} [options.subquery] - sub-query function
   * @returns {Object[]} results
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const results = await backend.query({
   *   type: 'object',
   *   properties: {
   *     type: {
   *       type: 'string',
   *       pattern: '^example$'
   *     }
   *   },
   *   required: [ 'type' ]
   * })
   *
   * for (const result of results) {
   *   console.log(result)
   * }
   */
	async query (context, querySchema, options = {}) {
		assert.ok(querySchema, 'No schema provided')

		const schema = defaultAdditionalPropertiesFalse(querySchema)

		if ((schema.properties.id && schema.properties.id.const) || (schema.properties.slug && schema.properties.slug.const)) {
			if (options.skip || options.limit === 0) {
				return []
			}

			// Performance shortcut
			let element = null

			const type = schema.properties.type && schema.properties.type.const

			if (!type) {
				logger.warn(context, 'Unspecified type in query for constant id/slug', {
					schema,
					database: this.database
				})
			}

			if (schema.properties.id && schema.properties.id.const) {
				if (type) {
					element = await this.getElementById(context, schema.properties.id.const, {
						type
					})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementByIdFromTable(
							context, this, table, schema.properties.id.const)
						if (element) {
							break
						}
					}
				}
			} else if (schema.properties.slug && schema.properties.slug.const) {
				if (type) {
					element = await this.getElementBySlug(context, schema.properties.slug.const, {
						type
					})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementBySlugFromTable(
							context, this, table, schema.properties.slug.const)
						if (element) {
							break
						}
					}
				}
			}

			if (!element) {
				return []
			}

			if (type && element.type !== type) {
				return []
			}

			if (schema.properties.active &&
				_.isBoolean(schema.properties.active.const) &&
				element.active !== schema.properties.active.const) {
				return []
			}

			const elementWithLinks = await resolveLinks(context, this, schema, options, _.cloneDeep(element))

			return _.compact([ filter(schema, elementWithLinks) ])
		}

		const sortExpression = schema[SORT_KEY]
		const tables = getBucketsForSchema(schema)
		if (tables.length === 1) {
			const results = await queryTable(context, this, tables[0], schema, options)
			return sortExpression
				? jellyscript.sort(results, sortExpression)
				: results
		}

		logger.warn(context, 'Looping through all tables to execute a query', {
			database: this.database
		})

		const items = _.flatten(await Bluebird.map(tables, (table) => {
			return queryTable(context, this, table, schema, options)
		}, {
			concurrency: 3
		}))

		return sortExpression
			? jellyscript.sort(items, sortExpression)
			: items
	}

	/**
   * @summary Stream events from objects that match a schema
   * @function
   * @public
   *
   * @description
   * The event emitter emits the following events:
   *
   * - data: when there is a change
   * - error: when there is an error
   * - closed: when the connection is closed after calling `.close()`
   *
   * @param {Object} context - execution context
   * @param {Object} querySchema - JSON Schema
   * @returns {EventEmitter} emietter
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const emitter = await backend.stream({
   *   type: 'object',
   *   properties: {
   *     type: {
   *       type: 'string',
   *       pattern: '^example$'
   *     }
   *   },
   *   required: [ 'type' ]
   * })
   *
   * emitter.on('error', (error) => {
   *   throw error
   * })
   *
   * emitter.on('closed', () => {
   *   console.log('Closed!')
   * })
   *
   * emitter.on('data', (change) => {
   *   console.log(change.before)
   *   console.log(change.after)
   * })
   *
   * // At some point...
   * emitter.close()
   */
	async stream (context, querySchema) {
		assert.ok(querySchema, 'No schema provided')

		const schema = defaultAdditionalPropertiesFalse(querySchema)
		const tables = getBucketsForSchema(schema)

		if (tables.length > 1) {
			logger.warn(context, 'Looping through all tables to execute a stream', {
				database: this.database
			})
		}

		const streamPoolMaster = this.streamConnection.getPoolMaster()
		const id = uuid()

		logger.info(context, 'Preparing streams', {
			length: streamPoolMaster.getLength(),
			available: streamPoolMaster.getAvailableLength(),
			tables: tables.length,
			id
		})

		const emitter = tables.length === 1
			? await createTableStream(context, this, tables[0], schema)
			: await mergeStreams(tables, (table) => {
				return createTableStream(context, this, table, schema)
			})

		emitter.id = id
		logger.info(context, 'Streams opened', {
			length: streamPoolMaster.getLength(),
			available: streamPoolMaster.getAvailableLength(),
			tables: tables.length,
			id: emitter.id
		})

		this.openStreams[emitter.id] = emitter

		emitter.on('closed', () => {
			Reflect.deleteProperty(this.openStreams, emitter.id)
		})

		return emitter
	}

	/**
   * @summary Report status from the backend
   * @function
   * @public
   *
   * @returns {Object} status
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
	 *
   * const status = await backend.getStatus()
	 * console.log(status)
   */
	async getStatus () {
		const streamPoolMaster = this.streamConnection.getPoolMaster()
		const poolMaster = this.connection.getPoolMaster()
		return {
			pools: {
				base: {
					length: poolMaster.getLength(),
					available: poolMaster.getAvailableLength()
				},
				streams: {
					length: streamPoolMaster.getLength(),
					available: streamPoolMaster.getAvailableLength()
				}
			}
		}
	}

	/**
	 * @summary Lock a slug
	 * @function
	 * @public
	 *
	 * @description
	 * It means that the owner has exclusive access on the slug.
	 *
	 * @param {String} owner - owner
	 * @param {String} slug - slug
	 * @returns {(String|Null)} the locked slug
	 *
	 * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
	 *
	 * if (await backend.lock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *   console.log('Got the lock!')
	 * }
	 */
	async lock (owner, slug) {
		const currentDate = new Date()

		// Insert is guaranteed to be atomic. If two nodes
		// try to insert the same lock, then only one can succeed.
		const response = await this.connection
			.db(this.database)
			.table(LOCK_TABLE)
			.insert({
				slug,
				owner,
				timestamp: currentDate.toISOString()
			}, {
				// Ack after writing to disk
				durability: 'hard',

				// Throw if there is a conflict
				conflict: 'error',

				// Always return lock object
				returnChanges: 'always'
			}).run()

		// Lock failed
		if (response.errors > 0) {
			if (response.first_error.startsWith('Duplicate primary key')) {
				if (owner === response.changes[0].old_val.owner &&
					owner === response.changes[0].new_val.owner) {
					return slug
				}

				return null
			}

			throw new errors.JellyfishDatabaseError(response.first_error)
		}

		return slug
	}

	/**
	 * @summary Unlock a slug
	 * @function
	 * @public
	 *
	 * @param {String} owner - owner
	 * @param {String} slug - slug
	 * @returns {(String|Null)} the locked slug
	 *
	 * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
	 *
	 * if (await backend.lock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *   console.log('Got the lock!')
	 *
	 *   if (await backend.unlock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *     console.log('Unlock!')
	 *   }
	 * }
	 */
	async unlock (owner, slug) {
		const response = await this.connection
			.db(this.database)
			.table(LOCK_TABLE)
			.getAll(slug)
			.filter({
				owner
			})
			.delete({
				durability: 'hard'
			})
			.run()

		if (response.errors > 0) {
			throw new errors.JellyfishDatabaseError(response.first_error)
		}

		if (response.deleted === 0) {
			return null
		}

		return slug
	}
}
