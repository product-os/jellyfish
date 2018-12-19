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
const logger = require('../logger').getLogger('jellyfish:backend')
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

const ALL_BUCKETS = Object.values(BUCKETS)
const SORT_KEY = '$$sort'
const LINK_KEY = '$$links'
const DATABASE_MAX_LIMIT = 100

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

const generateRethinkInstance = (options, ctx) => {
	return rethinkdb(_.merge({
		pool: true,
		cursor: false,
		optionalRun: false,
		silent: true,
		log: (message) => {
			logger.info(ctx, message)
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

const createTableStream = async (backend, table, schema, ctx) => {
	skhema.validate(schema, null, {
		schemaOnly: true
	})

	const emitter = new EventEmitter()

	logger.info(ctx, 'Streaming from table', {
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
		logger.info(ctx, 'Closing stream', {
			table,
			database: backend.database
		})

		return new Bluebird((resolve) => {
			cursor.close(() => {
				emitter.emit('closed')
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
			newMatch = await resolveLinks(backend, schema, {}, newMatch)
		}

		if (oldMatch) {
			oldMatch = await resolveLinks(backend, schema, {}, oldMatch)
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

const queryTable = async (backend, table, schema, options) => {
	logger.info(options.ctx, 'Querying from table', {
		table,
		database: backend.database
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

	if (options.limit && options.limit > DATABASE_MAX_LIMIT) {
		throw new errors.JellyfishInvalidLimit(
			`The limit is ${DATABASE_MAX_LIMIT}, but it was set to ${options.limit}`)
	}

	query = query.limit(Math.min(DATABASE_MAX_LIMIT, options.limit || DATABASE_MAX_LIMIT))

	const cursor = await query.run()
	const elements = await Bluebird.map(cursor, async (card) => {
		return resolveLinks(backend, schema, options, card)
	}, {
		concurrency: 3
	})

	const result = filter(schema, elements)

	logger.info(options.ctx, 'Query database response', {
		count: result.length
	})

	return result
}

const resolveLinks = async (backend, schema, options, card) => {
	const result = await links.evaluateCard({
		getElementsById: (ids, subqueryOptions) => {
			if (options.subquery) {
				return options.subquery(ids, subqueryOptions)
			}

			return backend.getElementsById(ids, subqueryOptions)
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

const getElementsByIdFromTable = async (backend, table, ids, ctx) => {
	logger.info(ctx, 'Batch get by id', {
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

const getElementByIdFromTable = async (backend, table, id, ctx) => {
	logger.info(ctx, 'Getting element by id', {
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

const getElementBySlugFromTable = async (backend, table, slug, ctx) => {
	logger.info(ctx, 'Getting element by slug', {
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

const upsertObject = async (backend, table, object, options) => {
	if (!object.slug) {
		throw new errors.JellyfishDatabaseError('Missing primary key')
	}

	const insertedObject = Object.assign({}, object)

	const elementId = uuid()

	if (options.replace) {
		logger.info(options.ctx, 'Upserting element', {
			table,
			slug: insertedObject.slug,
			database: backend.database
		})
	} else {
		logger.info(options.ctx, 'Updating element', {
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
			fromCard: backend.getElementById(insertedObject.data.from.id || insertedObject.data.from, {
				type: insertedObject.data.from.type || insertedObject.data.fromType
			}),
			toCard: backend.getElementById(insertedObject.data.to.id || insertedObject.data.to, {
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

			await upsertObject(backend, getBucketForType(updatedCard.type), updatedCard, {
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
	 * @param {Object} ctx - execution context
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
	async reset (ctx) {
		const tables = await this.getTables()
		await Promise.all(tables.map((table) => {
			logger.info(ctx, 'Dropping table', {
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
	 * @param {Object} ctx - execution context
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
	async destroy (ctx) {
		if (this.cache) {
			await this.cache.reset()
		}

		await this.disconnect()

		// Create a rethinkdb instance with no connection pooling to
		// drop the database
		const rethinkInstance = await generateRethinkInstance({
			pool: false
		}, ctx)

		const connection = await rethinkInstance.connect(this.options)

		logger.info(ctx, 'Dropping database', {
			database: this.database
		})

		await rethinkInstance.dbDrop(this.database).run(connection)
		logger.info(ctx, 'Database dropped', {
			database: this.database
		})
		await connection.close()
	}

	/**
   * @summary Connect to the database
   * @function
   * @public
   *
	 * @param {Object} ctx - execution context
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
	async connect (ctx) {
		if (!this.connection) {
			logger.info(ctx, 'Connecting to database', {
				database: this.database
			})

			// We create two connection pools, one will be used exclusively for streams
			// while the other will handle other request.
			// This is required because every stream query may listen for changes on
			// all the available buckets, which will quickly fill the pool with open
			// connections that can not be released
			this.connection = generateRethinkInstance(this.options, ctx)
			this.streamConnection = generateRethinkInstance(this.options, ctx)
			this.reqlSchema = reqlSchema(this.connection)
			this.reqlSchemaStreams = reqlSchema(this.streamConnection)
		}
		logger.info(ctx, 'Listing databases')
		const databases = await this.connection
			.dbList()
			.run()

		if (!databases.includes(this.database)) {
			if (this.cache) {
				await this.cache.reset()
			}

			logger.info(ctx, 'Creating database', {
				database: this.database
			})

			await this.connection
				.dbCreate(this.database)
				.run()

			// If we created the database add a delay, otherwise the next wait() might fail
			// with `Database does not exist`
			await waitForDBCreation(this.connection, this.database)
		}

		logger.info(ctx, 'Waiting for database', {
			database: this.database
		})

		// Prevent sporadic replica error:
		//   Cannot perform read: primary replica for shard ["", +inf) not available]
		// See https://github.com/rethinkdb/rethinkdb/issues/6160
		await this.connection.db(this.database).wait().run()

		for (const table of await this.getTables(ctx)) {
			logger.info(ctx, 'Checking table for stale indexes', {
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
					logger.info(ctx, 'Dropping stale table index', {
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

		for (const table of ALL_BUCKETS) {
			await this.createTable(table, ctx)

			logger.info(ctx, 'Creating table indexes', {
				table,
				database: this.database
			})

			const indexes = await this.connection
				.db(this.database)
				.table(table)
				.indexList()
				.run()

			for (const secondaryIndex of SECONDARY_INDEX) {
				if (!_.includes(indexes, secondaryIndex)) {
					logger.info(ctx, 'Creating table index', {
						table,
						database: this.database,
						index: secondaryIndex
					})

					await this.connection
						.db(this.database)
						.table(table)
						.indexCreate(secondaryIndex)
						.run()

					logger.info(ctx, 'Waiting for table indexes', {
						table,
						database: this.database
					})

					// Wait for all indexes to be ready
					await this.connection
						.db(this.database)
						.table(table)
						.indexWait()
						.run()
				}
			}
		}

		if (this.cache) {
			await this.cache.connect(ctx)
		}
	}

	/**
   * @summary Disconnect from the database
   * @function
   * @public
   *
	 * @param {Object} ctx - execution context
	 *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.disconnect()
   */
	async disconnect (ctx) {
		const {
			connection,
			streamConnection
		} = this
		if (streamConnection) {
			logger.info(ctx, 'Disconnecting streams from ', {
				database: this.database
			})

			for (const [ id, stream ] of Object.entries(this.openStreams)) {
				logger.info(ctx, 'Disconnecting stream ', id)
				await stream.close()
				Reflect.deleteProperty(this.openStreams, id)
			}

			await streamConnection.getPoolMaster().drain()
			this.reqlSchemaStreams = null
			this.streamConnection = null
		}
		if (connection) {
			logger.info(ctx, 'Disconnecting from database', {
				database: this.database
			})

			await connection.getPoolMaster().drain()
			this.reqlSchema = null
			this.connection = null
		}

		if (this.cache) {
			await this.cache.disconnect()
		}
	}

	/**
   * @summary Get the list of tables in the database
   * @function
   * @private
   *
	 * @param {Object} ctx - execution context
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
	getTables (ctx) {
		logger.info(ctx, 'Listing tables', {
			database: this.database
		})

		return this.connection
			.db(this.database)
			.tableList()
			.run()
	}

	/**
   * @summary Check if the database has a certain table
   * @function
   * @private
   *
   * @param {String} name - table name
	 * @param {Object} ctx - execution context
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
	async hasTable (name, ctx) {
		const tables = await this.getTables(ctx)
		return tables.includes(name)
	}

	/**
   * @summary Create a table in the database
   * @function
   * @public
   *
   * @param {String} name - table name
	 * @param {Object} ctx - execution context
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * await backend.createTable('foo')
   */
	async createTable (name, ctx) {
		if (!await this.hasTable(name, ctx)) {
			logger.info(ctx, 'Creating table', {
				table: name,
				database: this.database
			})

			await this.connection
				.db(this.database)
				.tableCreate(name, {
					primaryKey: 'slug'
				})
				.run()

			logger.info(ctx, 'Waiting for table', {
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
   * @param {Object} object - the object element
	 * @param {Object} ctx - execution context
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
	async insertElement (object, ctx) {
		const table = getBucketForType(object.type)
		return upsertObject(this, table, object, {
			unsetFromCache: true,
			replace: false,
			ctx
		})
	}

	/**
   * @summary Insert or update an element from the database
   * @function
   * @public
   *
   * @param {Object} object - the object element
	 * @param {Object} ctx - execution context
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
	async upsertElement (object, ctx) {
		const table = getBucketForType(object.type)
		return upsertObject(this, table, object, {
			unsetFromCache: false,
			replace: true,
			ctx
		})
	}

	/**
   * @summary Get an element from the database by id
   * @function
   * @private
   *
   * @param {String} id - id
	 * @param {Object} options - options
	 * @param {String} options.type - element type
	 * @param {Object} [options.ctx] - execution context
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
	async getElementById (id, options = {}) {
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

		const result = await getElementByIdFromTable(this, table, id, options.ctx)

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
   * @param {String[]} ids - ids
	 * @param {Object} options - options
	 * @param {String[]} options.types - element types
	 * @param {Object} [options.ctx] - execution context
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
	async getElementsById (ids, options) {
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

		const elements = await getElementsByIdFromTable(this, table, uncached, options.ctx)

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
   * @param {String} slug - slug
	 * @param {Object} options - options
	 * @param {String} options.type - element type
	 * @param {Object} [options.ctx] - execution context
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
	async getElementBySlug (slug, options = {}) {
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

		const result = await getElementBySlugFromTable(this, table, slug, options.ctx)

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
   * @param {Object} querySchema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Number} [options.limit] - limit
	 * @param {Number} [options.skip] - skip
	 * @param {String | String[]} [options.sortBy] - Key or key path as an array to
	 *   a value that the query should be sorted by
	 * @param {'asc' | 'desc'} [options.sortDir] - Set sort direction,
	 *   defaults to asc (ascending)
	 * @param {Function} [options.subquery] - sub-query function
	 * @param {Object} [options.ctx] - execution context
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
	async query (querySchema, options = {}) {
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
				logger.debug(options.ctx, 'Unspecified type in query for constant id/slug', {
					schema,
					database: this.database
				})
			}

			if (schema.properties.id && schema.properties.id.const) {
				if (type) {
					element = await this.getElementById(schema.properties.id.const, {
						ctx: options.ctx,
						type
					})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementByIdFromTable(
							this, table, schema.properties.id.const, options.ctx)
						if (element) {
							break
						}
					}
				}
			} else if (schema.properties.slug && schema.properties.slug.const) {
				if (type) {
					element = await this.getElementBySlug(schema.properties.slug.const, {
						ctx: options.ctx,
						type
					})
				} else {
					for (const table of ALL_BUCKETS) {
						element = await getElementBySlugFromTable(
							this, table, schema.properties.slug.const, options.ctx)
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

			const elementWithLinks = await resolveLinks(this, schema, options, _.cloneDeep(element))

			return _.compact([ filter(schema, elementWithLinks) ])
		}

		const sortExpression = schema[SORT_KEY]
		const tables = getBucketsForSchema(schema)
		if (tables.length === 1) {
			const results = await queryTable(this, tables[0], schema, options)
			return sortExpression
				? jellyscript.sort(results, sortExpression)
				: results
		}

		logger.debug(options.ctx, 'Looping through all tables to execute a query', {
			database: this.database
		})

		const items = _.flatten(await Bluebird.map(tables, (table) => {
			return queryTable(this, table, schema, options)
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
   * @param {Object} querySchema - JSON Schema
   * @param {Object} ctx - execution context
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
	async stream (querySchema, ctx) {
		assert.ok(querySchema, 'No schema provided')

		const schema = defaultAdditionalPropertiesFalse(querySchema)
		const tables = getBucketsForSchema(schema)

		if (tables.length > 1) {
			logger.debug(ctx, 'Looping through all tables to execute a stream', {
				database: this.database
			})
		}

		const emitter = tables.length === 1
			? await createTableStream(this, tables[0], schema, ctx)
			: await mergeStreams(tables, (table) => {
				return createTableStream(this, table, schema, ctx)
			})

		emitter.id = uuid()
		this.openStreams[emitter.id] = emitter

		emitter.on('closed', () => {
			Reflect.deleteProperty(this.openStreams, emitter.id)
		})

		return emitter
	}
}
