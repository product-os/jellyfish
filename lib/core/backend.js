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

const rethinkdb = require('rethinkdb')
const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const debug = require('debug')('jellyfish:backend')
const Bluebird = require('bluebird')
const reqlSchema = require('reql-schema')
const skhema = require('skhema')
const jellyscript = require('../jellyscript')
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

const handleInsertionResults = (table, results, object, cache, options = {}) => {
	if (results.errors === 0) {
		const id = _.get(results, [ 'generated_keys', '0' ]) || object.id
		const result = Object.assign({}, object)
		result.id = id

		if (options.unsetFromCache) {
			cache.unset(object)
		}

		cache.set(table, result)
		return result
	}

	throw new errors.JellyfishDatabaseError(results.first_error)
}

const mergeStreams = async (keys, createFunction) => {
	const emitter = new EventEmitter()
	const streams = {}

	emitter.closeStream = (key) => {
		if (!streams[key]) {
			return
		}

		streams[key].close()
		Reflect.deleteProperty(streams, key)
	}

	emitter.restartStream = async (key) => {
		emitter.closeStream(key)
		streams[key] = await createFunction(key)
	}

	for (const key of keys) {
		await emitter.restartStream(key)
		streams[key].on('closed', () => {
			emitter.closeStream(key)
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

	emitter.close = () => {
		_.each(streams, (stream) => {
			stream.close()
		})
	}

	return emitter
}

const createTableStream = async (backend, table, schema) => {
	const emitter = new EventEmitter()

	debug(`Opening stream in table ${table}`)
	const cursor = await reqlSchema(backend.database, table, schema)
		.changes()
		.run(backend.connection)

	emitter.close = () => {
		debug(`Closing stream in table ${table}`)

		// eslint-disable-next-line no-underscore-dangle
		cursor._endFlag = true

		// eslint-disable-next-line no-underscore-dangle
		cursor._closeAsap = true

		// eslint-disable-next-line no-underscore-dangle
		cursor._closeCbPromise = null

		// Otherwise the cursor will not trigger the on-finished
		// if it didn't find anything during its life (??)
		// eslint-disable-next-line no-underscore-dangle
		cursor._promptNext()
	}

	cursor.each((error, change) => {
		if (error) {
			emitter.close()
			cursor.close(() => {
				emitter.emit('error', error)
			})

			return
		}

		const newMatch = skhema.filter(schema, change.new_val)
		const oldMatch = skhema.filter(schema, change.old_val)

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
	}, () => {
		cursor.close(() => {
			emitter.emit('closed')
		})
	})

	return emitter
}

const queryTable = async (backend, table, schema, options) => {
	debug(`Querying entries in table ${table}`)

	let query = await reqlSchema(backend.database, table, schema)
	query = query.orderBy(rethinkdb.row('data')('timestamp'))

	if (options.skip) {
		query = query.skip(options.skip)
	}

	if (options.limit) {
		query = query.limit(options.limit)
	}

	const cursor = await query.run(backend.connection)
	const elements = await Bluebird.map(await cursor.toArray(), async (card) => {
		const result = await links.evaluateCard({
			query: options.subquery || backend.query.bind(backend)
		}, card, schema[LINK_KEY] || {})
		if (!result) {
			return null
		}

		if (!_.isEmpty(result)) {
			card.links = result
		}

		return card
	}, {
		concurrency: 3
	})

	return skhema.filter(schema, _.compact(elements))
}

const getElementByIdFromTable = async (backend, table, id) => {
	debug(`Getting element by id ${id} from table ${table} in database ${backend.database}`)

	let result = null
	try {
		result = await rethinkdb
			.db(backend.database)
			.table(table)
			.get(id)
			.run(backend.connection)
	} catch (error) {
		if (error.name !== 'ReqlOpFailedError' ||
				error.msg !== `Table \`${backend.database}.${table}\` does not exist.`) {
			throw error
		}
	}

	return result
}

const getElementBySlugFromTable = async (backend, table, slug) => {
	debug(`Getting element by slug ${slug} from table ${table} in database ${backend.database}`)
	let cursor = null
	try {
		cursor = await rethinkdb
			.db(backend.database)
			.table(table)
			.filter({
				slug
			})
			.limit(1)
			.run(backend.connection)
	} catch (error) {
		if (error.name !== 'ReqlOpFailedError' ||
				error.msg !== `Table \`${backend.database}.${table}\` does not exist.`) {
			throw error
		}
	}

	let result = null

	if (cursor) {
		try {
			result = await cursor.next()
		} catch (error) {
			// These string comparisons are the way RethinkDB suggests to
			// check whether the cursor is empty. I couldn't find another
			// way to accomplish this.
			// See: https://www.rethinkdb.com/api/javascript/next/
			if (error.name !== 'ReqlDriverError' || error.message !== 'No more rows in the cursor.') {
				throw error
			}
		}
	}

	return result
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
			password: options.password
		}, _.isEmpty)

		if (options.certificate) {
			this.options.ssl = {
				ca: Buffer.from(options.certificate)
			}
		}

		this.database = options.database
		this.cache = cache
	}

	/**
   * @summary Reset the database
   * @function
   * @public
   *
   * @description
   * For testing purposes.
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.reset()
   */
	async reset () {
		const tables = await this.getTables()
		await Promise.all(tables.map((table) => {
			debug(`Dropping table ${table}`)
			return rethinkdb
				.db(this.database)
				.tableDrop(table)
				.run(this.connection)
		}).concat([ this.cache.reset() ]))
	}

	/**
   * @summary Connect to the database
   * @function
   * @public
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
	async connect () {
		if (!this.connection) {
			debug('Connecting to database')
			this.connection = await rethinkdb.connect(this.options)
		}

		debug('Querying database list')
		const databases = await rethinkdb
			.dbList()
			.run(this.connection)

		if (!databases.includes(this.database)) {
			debug(`Creating database ${this.database}`)
			await Promise.all([
				this.cache.reset(),
				rethinkdb
					.dbCreate(this.database)
					.run(this.connection)
			])
		}

		// Prevent sporadic replica error:
		//   Cannot perform read: primary replica for shard ["", +inf) not available]
		// See https://github.com/rethinkdb/rethinkdb/issues/6160
		await rethinkdb.db(this.database).wait().run(this.connection)

		for (const table of await this.getTables()) {
			// Get rid of old indexes, so we can be sure
			// they get re-created every time the server
			// restarts, to accomodate for updates, etc.
			const indexes = await rethinkdb
				.db(this.database)
				.table(table)
				.indexList()
				.run(this.connection)
			for (const index of indexes) {
				await rethinkdb
					.db(this.database)
					.table(table)
					.indexDrop(index)
					.run(this.connection)
			}
		}

		for (const table of ALL_BUCKETS) {
			await this.createTable(table)

			// Lets make sure the table is ready before continuing
			await rethinkdb
				.db(this.database)
				.table(table)
				.wait()
				.run(this.connection)

			if (table === BUCKETS.cards) {
				// Add secondary indexes for card types, as
				// querying for all cards of a certain type
				// is a very common access pattern.
				await rethinkdb
					.db(this.database)
					.table(table)
					.indexCreate('type')
					.run(this.connection)
			}

			if (table === BUCKETS.links) {
				await rethinkdb
					.db(this.database)
					.table(table)
					.indexCreate('from', rethinkdb.row('data')('from'))
					.run(this.connection)
				await rethinkdb
					.db(this.database)
					.table(table)
					.indexCreate('to', rethinkdb.row('data')('to'))
					.run(this.connection)
			}

			// Wait for all indexes to be ready
			await rethinkdb
				.db(this.database)
				.table(table)
				.indexWait()
				.run(this.connection)
		}

		await this.cache.connect()
	}

	/**
   * @summary Disconnect from the database
   * @function
   * @public
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   * await backend.disconnect()
   */
	async disconnect () {
		if (this.connection) {
			debug('Disconnecting from database')
			await this.connection.close()
			this.connection = null
		}

		await this.cache.disconnect()
	}

	/**
   * @summary Get the list of tables in the database
   * @function
   * @private
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
	getTables () {
		debug('Querying table list')
		return rethinkdb
			.db(this.database)
			.tableList()
			.run(this.connection)
	}

	/**
   * @summary Check if the database has a certain table
   * @function
   * @private
   *
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
	async hasTable (name) {
		const tables = await this.getTables()
		return tables.includes(name)
	}

	/**
   * @summary Create a table in the database
   * @function
   * @public
   *
   * @param {String} name - table name
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * await backend.createTable('foo')
   */
	async createTable (name) {
		if (!await this.hasTable(name)) {
			debug(`Creating table ${name} in database ${this.database}`)
			await rethinkdb
				.db(this.database)
				.tableCreate(name)
				.run(this.connection)
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
	async insertElement (object) {
		const table = getBucketForType(object.type)

		// Links is a computed property
		if (object.links) {
			object.links = {}
		}

		if (object.id && await this.getElementById(object.id)) {
			throw new errors.JellyfishElementAlreadyExists(`There is already an element with id ${object.id}`)
		}

		if (object.slug && await this.getElementBySlug(object.slug)) {
			throw new errors.JellyfishElementAlreadyExists(`There is already an element with slug ${object.slug}`)
		}

		debug(`Inserting element to table ${table} in database ${this.database}`)
		const results = await rethinkdb
			.db(this.database)
			.table(table)
			.insert(object)
			.run(this.connection)

		return handleInsertionResults(table, results, object, this.cache, {
			unsetFromCache: true
		})
	}

	/**
   * @summary Insert or update an element from the database
   * @function
   * @public
   *
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
	async upsertElement (object) {
		const table = getBucketForType(object.type)

		if (!object.slug) {
			if (object.id) {
				const element = await this.getElementById(object.id)
				if (element) {
					if (object.links) {
						object.links = element.links
					}

					debug(`Updating element by id ${object.id} in table ${table} in database ${this.database}`)
					const results = await rethinkdb
						.db(this.database)
						.table(table)
						.get(element.id)
						.replace(object)
						.run(this.connection)

					return handleInsertionResults(table, results, object, this.cache, {
						unsetFromCache: true
					})
				}
			}

			return this.insertElement(object)
		}

		if (object.id) {
			const element = await this.getElementById(object.id)
			if (element) {
				const elementBySlug = await this.getElementBySlug(object.slug)
				if (elementBySlug && elementBySlug.id !== object.id) {
					throw new errors.JellyfishElementAlreadyExists(
						`There is already an element with slug ${object.slug} but the id is not ${object.id}`)
				}

				if (object.links) {
					object.links = element.links
				}

				debug(`Updating element by id ${object.id} in table ${table} in database ${this.database}`)
				const results = await rethinkdb
					.db(this.database)
					.table(table)
					.get(element.id)
					.replace(object)
					.run(this.connection)

				return handleInsertionResults(table, results, object, this.cache, {
					unsetFromCache: true
				})
			}
		}

		const element = await this.getElementBySlug(object.slug)
		if (element) {
			if (object.id && element.id !== object.id) {
				throw new errors.JellyfishElementAlreadyExists(
					`There is already an element with slug ${object.slug} but the id is not ${object.id}`)
			}

			debug(`Updating element by slug ${object.slug} in table ${table} in database ${this.database}`)
			const finalObject = Object.assign({}, object, {
				id: element.id
			})

			if (finalObject.links) {
				finalObject.links = element.links
			}

			const results = await rethinkdb
				.db(this.database)
				.table(table)
				.get(element.id)
				.replace(finalObject)
				.run(this.connection)

			return handleInsertionResults(table, results, finalObject, this.cache, {
				unsetFromCache: false
			})
		}

		return this.insertElement(object)
	}

	/**
   * @summary Get an element from the database by id
   * @function
   * @private
   *
   * @param {String} id - id
	 * @param {Object} [options] - options
	 * @param {String} [options.type] - element type
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
   * const element = await backend.getElementById(id)
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementById (id, options = {}) {
		if (options.type) {
			const table = getBucketForType(options.type)

			const cacheResult = this.cache.getById(table, id)
			if (cacheResult.hit) {
				return cacheResult.element
			}

			const result = await getElementByIdFromTable(this, table, id)

			if (result) {
				this.cache.set(table, result)
			} else {
				this.cache.setMissingId(table, id)
			}

			return result
		}

		for (const table of ALL_BUCKETS) {
			const cacheResult = this.cache.getById(table, id)
			if (cacheResult.hit && cacheResult.element) {
				return cacheResult.element
			}
		}

		for (const table of ALL_BUCKETS) {
			const cacheResult = this.cache.getById(table, id)
			if (cacheResult.hit && !cacheResult.element) {
				continue
			}

			const result = await getElementByIdFromTable(this, table, id)
			if (result) {
				this.cache.set(table, result)
				return result
			}

			this.cache.setMissingId(table, id)
		}

		return null
	}

	/**
   * @summary Get an element from the database by a slug
   * @function
   * @private
   *
   * @param {String} slug - slug
	 * @param {Object} [options] - options
	 * @param {String} [options.type] - element type
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
   * const element = await backend.getElementBySlug('hello')
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementBySlug (slug, options = {}) {
		if (options.type) {
			const table = getBucketForType(options.type)

			const cacheResult = this.cache.getBySlug(table, slug)
			if (cacheResult.hit) {
				return cacheResult.element
			}

			const result = await getElementBySlugFromTable(this, table, slug)

			if (result) {
				this.cache.set(table, result)
			} else {
				this.cache.setMissingSlug(table, slug)
			}

			return result
		}

		for (const table of ALL_BUCKETS) {
			const cacheResult = this.cache.getBySlug(table, slug)
			if (cacheResult.hit && cacheResult.element) {
				return cacheResult.element
			}
		}

		for (const table of ALL_BUCKETS) {
			const cacheResult = this.cache.getBySlug(table, slug)
			if (cacheResult.hit && !cacheResult.element) {
				continue
			}

			const result = await getElementBySlugFromTable(this, table, slug)
			if (result) {
				this.cache.set(table, result)
				return result
			}

			this.cache.setMissingSlug(table, slug)
		}

		return null
	}

	/**
   * @summary Query a table using JSON Schema
   * @function
   * @public
   *
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Number} [options.limit] - limit
	 * @param {Number} [options.skip] - skip
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
	async query (schema, options = {}) {
		if ((schema.properties.id && schema.properties.id.const) || (schema.properties.slug && schema.properties.slug.const)) {
			if (options.skip || options.limit === 0) {
				return []
			}

			// Performance shortcut
			let element = null

			if (schema.properties.id && schema.properties.id.const) {
				element = await this.getElementById(schema.properties.id.const)
			} else if (schema.properties.slug && schema.properties.slug.const) {
				element = await this.getElementBySlug(schema.properties.slug.const)
			}

			if (!element) {
				return []
			}

			if (schema.properties.type &&
				schema.properties.type.const &&
				element.type !== schema.properties.type.const) {
				return []
			}

			if (schema.properties.active &&
				_.isBoolean(schema.properties.active.const) &&
				element.active !== schema.properties.active.const) {
				return []
			}

			return _.compact([ skhema.filter(schema, _.cloneDeep(element)) ])
		}

		const sortExpression = schema[SORT_KEY]
		const tables = getBucketsForSchema(schema)
		if (tables.length === 1) {
			const results = await queryTable(this, tables[0], schema, options)
			return sortExpression
				? jellyscript.sort(results, sortExpression)
				: results
		}

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
   * @param {Object} schema - JSON Schema
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
	async stream (schema) {
		const tables = getBucketsForSchema(schema)
		if (tables.length === 1) {
			return createTableStream(this, tables[0], schema)
		}

		return mergeStreams(tables, (table) => {
			return createTableStream(this, table, schema)
		})
	}
}
