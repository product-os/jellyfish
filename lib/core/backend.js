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
const reqlSchema = require('reql-schema')
const skhema = require('skhema')
const errors = require('./errors')

const isInsertionError = (results) => {
	return results.errors !== 0
}

const handleInsertionResults = (results, id) => {
	if (!isInsertionError(results)) {
		return _.get(results, [ 'generated_keys' ], [ id ])[0]
	}

	throw new errors.JellyfishDatabaseError(results.first_error)
}

const getElementFromSchema = async (backend, table, schema) => {
	let element = null
	if (schema.properties.id && schema.properties.id.const) {
		element = await backend.getElementById(table, schema.properties.id.const)
	} else if (schema.properties.slug && schema.properties.slug.const) {
		element = await backend.getElementBySlug(table, schema.properties.slug.const)
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
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} inserted element id
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async insertElement (table, object) {
		if (object.id && await this.getElementById(table, object.id)) {
			throw new errors.JellyfishElementAlreadyExists(`There is already an element with id ${object.id}`)
		}

		if (object.slug && await this.getElementBySlug(table, object.slug)) {
			throw new errors.JellyfishElementAlreadyExists(`There is already an element with slug ${object.slug}`)
		}

		debug(`Inserting element to table ${table} in database ${this.database}`)
		const results = await rethinkdb
			.db(this.database)
			.table(table)
			.insert(object)
			.run(this.connection)

		if (!isInsertionError(results)) {
			const id = _.get(results, [ 'generated_keys', '0' ]) || object.id
			this.cache.unset(object)
			this.cache.set(table, await this.getElementById(table, id))
		}

		return handleInsertionResults(results, object.id)
	}

	/**
   * @summary Insert or update an element from the database
   * @function
   * @public
   *
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} upserted element id
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const id = await backend.upsertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async upsertElement (table, object) {
		if (!object.slug) {
			if (object.id && await this.getElementById(table, object.id)) {
				debug(`Updating element by id ${object.id} in table ${table} in database ${this.database}`)
				const results = await rethinkdb
					.db(this.database)
					.table(table)
					.get(object.id)
					.replace(object)
					.run(this.connection)

				if (!isInsertionError(results)) {
					// So that the following query doesn't hit the cache
					this.cache.unset(object)
					this.cache.set(table, object)
				}

				return handleInsertionResults(results, object.id)
			}

			return this.insertElement(table, object)
		}

		if (object.id && await this.getElementById(table, object.id)) {
			const element = await this.getElementBySlug(table, object.slug)
			if (element && element.id !== object.id) {
				throw new errors.JellyfishElementAlreadyExists(
					`There is already an element with slug ${object.slug} but the id is not ${object.id}`)
			}

			debug(`Updating element by id ${object.id} in table ${table} in database ${this.database}`)
			const results = await rethinkdb
				.db(this.database)
				.table(table)
				.get(object.id)
				.replace(object)
				.run(this.connection)

			if (!isInsertionError(results)) {
				// So that the following query doesn't hit the cache
				this.cache.unset(object)
				this.cache.set(table, object)
			}

			return handleInsertionResults(results, object.id)
		}

		const element = await this.getElementBySlug(table, object.slug)
		if (element) {
			if (object.id && element.id !== object.id) {
				throw new errors.JellyfishElementAlreadyExists(
					`There is already an element with slug ${object.slug} but the id is not ${object.id}`)
			}

			debug(`Updating element by slug ${object.slug} in table ${table} in database ${this.database}`)
			const finalObject = Object.assign({
				id: element.id
			}, object)

			const results = await rethinkdb
				.db(this.database)
				.table(table)
				.get(element.id)
				.replace(finalObject)
				.run(this.connection)

			if (!isInsertionError(results)) {
				this.cache.set(table, finalObject)
			}

			return handleInsertionResults(results, finalObject.id)
		}

		return this.insertElement(table, object)
	}

	/**
   * @summary Get an element from the database by id
   * @function
   * @private
   *
   * @param {String} table - table name
   * @param {String} id - id
   * @returns {(Object|Null)} element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement('foo', {
   *   data: 'foo'
   * })
   *
   * const element = await backend.getElementById('foo', id)
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementById (table, id) {
		const cacheResult = this.cache.getById(table, id)
		if (cacheResult.hit) {
			return cacheResult.element
		}

		debug(`Getting element by id ${id} from table ${table} in database ${this.database}`)

		let result = null
		try {
			result = await rethinkdb
				.db(this.database)
				.table(table)
				.get(id)
				.run(this.connection)
		} catch (error) {
			if (error.name !== 'ReqlOpFailedError' ||
					error.msg !== `Table \`${this.database}.${table}\` does not exist.`) {
				throw error
			}
		}

		if (result) {
			this.cache.set(table, result)
		} else {
			this.cache.setMissingId(table, id)
		}

		return result
	}

	/**
   * @summary Get an element from the database by a slug
   * @function
   * @private
   *
   * @param {String} table - table name
   * @param {String} slug - slug
   * @returns {(Object|Null)} element
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * await backend.insertElement('foo', {
   *   slug: 'hello',
   *   data: 'foo'
   * })
   *
   * const element = await backend.getElementBySlug('foo', 'hello')
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementBySlug (table, slug) {
		const cacheResult = this.cache.getBySlug(table, slug)
		if (cacheResult.hit) {
			return cacheResult.element
		}

		debug(`Getting element by slug ${slug} from table ${table} in database ${this.database}`)
		let cursor = null
		try {
			cursor = await rethinkdb
				.db(this.database)
				.table(table)
				.filter({
					slug
				})
				.limit(1)
				.run(this.connection)
		} catch (error) {
			if (error.name !== 'ReqlOpFailedError' ||
					error.msg !== `Table \`${this.database}.${table}\` does not exist.`) {
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

		if (result) {
			this.cache.set(table, result)
		} else {
			this.cache.setMissingSlug(table, slug)
		}

		return result
	}

	/**
   * @summary Query a table using JSON Schema
   * @function
   * @public
   *
   * @param {String} table - table name
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Number} [options.limit] - limit
   * @returns {Object[]} results
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const results = await backend.query('foo', {
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
	async query (table, schema, options = {}) {
		// Performance shortcut
		if ((schema.properties.id && schema.properties.id.const) ||
			(schema.properties.slug && schema.properties.slug.const)) {
			return getElementFromSchema(this, table, schema)
		}

		debug(`Querying entries in table ${table}`)

		let query = await reqlSchema(this.database, table, schema)

		if (options.limit) {
			query = query.limit(options.limit)
		}

		const cursor = await query
			.orderBy(rethinkdb.row('data')('timestamp'))
			.run(this.connection)

		// This is a VERY inefficient way to query a RethinkDB database
		// using JSON schema. This is meant to be used as a prototype,
		// and we should implement a proper JSON Schema to ReQL translator.
		const items = await cursor.toArray()
		return skhema.filter(schema, items)
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
   * @param {String} table - table name
   * @param {Object} schema - JSON Schema
   * @returns {EventEmitter} emietter
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const emitter = await backend.stream('foo', {
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
	async stream (table, schema) {
		const emitter = new EventEmitter()

		debug(`Opening stream in table ${table}`)
		const cursor = await reqlSchema(this.database, table, schema)
			.changes()
			.run(this.connection)

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

			const element = change.new_val

			// This means that `old_val` was deleted
			if (_.isNil(element)) {
				return
			}

			const match = skhema.filter(schema, element)
			if (match) {
				emitter.emit('data', {
					before: change.old_val
						? skhema.filter(schema, change.old_val) || {}
						: null,
					after: match
				})
			}
		}, () => {
			cursor.close(() => {
				emitter.emit('closed')
			})
		})

		return emitter
	}

	/**
   * @summary Stream events from objects that match a schema on more than one table
   * @function
   * @public
   *
   * @description
	 * The event emitter emits the same events as `.stream()`.
   *
   * @param {String[]} tables - table names
   * @param {Object} schema - JSON Schema
   * @returns {EventEmitter} emietter
   *
   * @example
	 * const cache = new Cache()
   * const backend = new Backend(cache, { ... })
   * await backend.connect()
   *
   * const emitter = await backend.streamJoin([ 'foo', 'bar', 'baz' ], {
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
	async streamJoin (tables, schema) {
		return mergeStreams(tables, (bucket) => {
			return this.stream(bucket, schema)
		})
	}
}
