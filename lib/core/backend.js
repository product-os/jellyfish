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
const errors = require('./errors')
const jsonSchema = require('./json-schema')
const Cache = require('./cache')

const isInsertionError = (results) => {
	return results.errors !== 0
}

const handleInsertionResults = (results, id) => {
	if (!isInsertionError(results)) {
		return _.first(_.get(results, [ 'generated_keys' ], [ id ]))
	}

	throw new errors.JellyfishDatabaseError(results.first_error)
}

module.exports = class Backend {
	/**
   * @summary The Jellyfish Backend
   * @class
   * @public
   *
   * @param {Object} options - options
   * @param {String} options.database - database name
   * @param {String} options.host - database host
   * @param {Number} options.port - database port
   * @param {String} [options.user] - database user
   * @param {String} [options.password] - database password
   * @param {String} [options.certificate] - database SSL certificate
   *
   * @example
   * const backend = new Backend({
   *   database: 'my-jellyfish',
   *   host: 'localhost',
   *   port: 28015,
   *   user: 'admin',
   *   password: 'secret'
   * })
   */
	constructor (options) {
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
		this.cache = new Cache()
		this.tables = new Set()
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
   * const backend = new Backend({ ... })
   * await backend.connect()
   * await backend.reset()
   */
	async reset () {
		const tables = await this.getTables()

		for (const table of tables) {
			debug(`Dropping table ${table}`)
			await rethinkdb
				.db(this.database)
				.tableDrop(table)
				.run(this.connection)
		}

		this.cache.reset()
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
   * const backend = new Backend({ ... })
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
			this.cache.reset()
			await rethinkdb
				.dbCreate(this.database)
				.run(this.connection)
		}

		// Prevent sporadic replica error:
		//   Cannot perform read: primary replica for shard ["", +inf) not available]
		// See https://github.com/rethinkdb/rethinkdb/issues/6160
		await rethinkdb.db(this.database).wait().run(this.connection)

		this.tables = new Set(await this.getTables())
	}

	/**
   * @summary Disconnect from the database
   * @function
   * @public
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   * await backend.disconnect()
   */
	async disconnect () {
		if (this.connection) {
			debug('Disconnecting from database')
			await this.connection.close()
			this.connection = null
		}
	}

	/**
   * @summary Get the list of tables in the database
   * @function
   * @private
   *
   * @returns {String[]} tables
   *
   * @example
   * const backend = new Backend({ ... })
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
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * if (backend.hasTable('foo')) {
   *   console.log('The database has a table called foo')
   * }
   */
	hasTable (name) {
		return this.tables.has(name)
	}

	/**
   * @summary Create a table in the database
   * @function
   * @public
   *
   * @param {String} name - table name
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * await backend.createTable('foo')
   */
	async createTable (name) {
		if (!this.hasTable(name)) {
			debug(`Creating table ${name} in database ${this.database}`)
			this.tables.add(name)
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
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * const id = await backend.insertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async insertElement (table, object) {
		await this.createTable(table)

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
   * @summary Update an element from the database
   * @function
   * @public
   *
   * @description
   * This function will throw if the element doesn't exist.
   *
   * @param {String} table - table name
   * @param {Object} object - the object element
   * @returns {String} updated element id
   *
   * @example
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * await backend.insertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   *
   * const id = await backend.updateElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'bar'
   * })
   */
	async updateElement (table, object) {
		await this.createTable(table)

		if (!object.id && !object.slug) {
			throw new errors.JellyfishNoIdentifier('You can\'t perform an update without an id nor slug')
		}

		if (object.id) {
			if (object.slug) {
				const element = await this.getElementBySlug(table, object.slug)
				if (element && element.id !== object.id) {
					throw new errors.JellyfishElementAlreadyExists('There is already an element with slug' +
                                                         ` ${object.slug} but the id is not ${object.id}`)
				}
			}

			if (!await this.getElementById(table, object.id)) {
				throw new errors.JellyfishNoElement(`Can't find element with id ${object.id}`)
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
				this.cache.set(table, await this.getElementById(table, object.id))
			}

			return handleInsertionResults(results, object.id)
		}

		const element = await this.getElementBySlug(table, object.slug)
		if (!element) {
			throw new errors.JellyfishNoElement(`Can't find element with slug ${object.slug}`)
		}

		debug(`Updating element by slug ${object.slug} in table ${table} in database ${this.database}`)
		const finalObject = Object.assign({
			id: element.id
		}, object)

		const results = await rethinkdb
			.db(this.database)
			.table(table)
			.filter({
				slug: object.slug
			})
			.limit(1)
			.replace(finalObject)
			.run(this.connection)

		if (!isInsertionError(results)) {
			this.cache.set(table, finalObject)
		}

		return handleInsertionResults(results, finalObject.id)
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
   * const backend = new Backend({ ... })
   * await backend.connect()
   *
   * const id = await backend.upsertElement('foo', {
   *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
   *   data: 'foo'
   * })
   */
	async upsertElement (table, object) {
		await this.createTable(table)

		if (!object.slug) {
			if (object.id && await this.getElementById(table, object.id)) {
				return this.updateElement(table, object)
			}

			return this.insertElement(table, object)
		}

		if (object.id && await this.getElementById(table, object.id)) {
			return this.updateElement(table, object)
		}

		if (await this.getElementBySlug(table, object.slug)) {
			return this.updateElement(table, object)
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
   * const backend = new Backend({ ... })
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
		if (!this.hasTable(table)) {
			return null
		}

		const cacheResult = this.cache.get(table, id)
		if (cacheResult.hit) {
			return cacheResult.element
		}

		debug(`Getting element by id ${id} from table ${table} in database ${this.database}`)
		const result = await rethinkdb
			.db(this.database)
			.table(table)
			.get(id)
			.run(this.connection)

		if (result) {
			this.cache.set(table, result)
		} else {
			this.cache.setMissing(table, id)
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
   * const backend = new Backend({ ... })
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
		if (!this.hasTable(table)) {
			return null
		}

		const cacheResult = this.cache.get(table, slug)
		if (cacheResult.hit) {
			return cacheResult.element
		}

		debug(`Getting element by slug ${slug} from table ${table} in database ${this.database}`)
		const cursor = await rethinkdb
			.db(this.database)
			.table(table)
			.filter({
				slug
			})
			.limit(1)
			.run(this.connection)

		let result = null

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

		if (result) {
			this.cache.set(table, result)
		} else {
			this.cache.setMissing(table, slug)
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
   * @returns {Object[]} results
   *
   * @example
   * const backend = new Backend({ ... })
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
	async query (table, schema) {
		const properties = _.sortBy(_.keys(schema.properties))

		// Performance shortcuts

		if (_.isEqual(properties, [ 'id' ]) && schema.properties.id.const) {
			return jsonSchema.filter(schema, _.compact([
				_.cloneDeep(await this.getElementById(table, schema.properties.id.const))
			]))
		}

		if (_.isEqual(properties, [ 'slug' ]) && schema.properties.slug.const) {
			return jsonSchema.filter(schema, _.compact([
				_.cloneDeep(await this.getElementBySlug(table, schema.properties.slug.const))
			]))
		}

		if (_.isEqual(properties, [ 'active', 'id' ]) && schema.properties.id.const && schema.properties.active.const) {
			const element = await this.getElementById(table, schema.properties.id.const)

			if (element && element.active !== schema.properties.active.const) {
				return []
			}

			return jsonSchema.filter(schema, _.compact([ _.cloneDeep(element) ]))
		}

		if (_.isEqual(properties, [ 'active', 'slug' ]) && schema.properties.slug.const && schema.properties.active.const) {
			const element = await this.getElementBySlug(table, schema.properties.slug.const)

			if (element && element.active !== schema.properties.active.const) {
				return []
			}

			return jsonSchema.filter(schema, _.compact([ _.cloneDeep(element) ]))
		}

		// Basic filtering to help with performance
		const filter = _.reduce(schema.properties, (result, value, key) => {
			if (value.const) {
				result[key] = value.const
			}

			return result
		}, {})

		debug(`Querying entries in table ${table}`)
		const cursor = await rethinkdb
			.db(this.database)
			.table(table)
			.filter(filter)
			.orderBy(rethinkdb.row('data')('timestamp'))
			.run(this.connection)

		const results = []

		// This is a VERY inefficient way to query a RethinkDB database
		// using JSON schema. This is meant to be used as a prototype,
		// and we should implement a proper JSON Schema to ReQL translator.
		await cursor.eachAsync((element) => {
			if (jsonSchema.filter(schema, element)) {
				results.push(element)
			}
		})

		return results
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
   * const backend = new Backend({ ... })
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
		const cursor = await rethinkdb
			.db(this.database)
			.table(table)
			.changes()
			.run(this.connection)

		emitter.close = () => {
			debug(`Closing stream in table ${table}`)

			// eslint-disable-next-line no-underscore-dangle
			cursor._endFlag = true

			// eslint-disable-next-line no-underscore-dangle
			cursor._closeAsap = true

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

			const match = jsonSchema.filter(schema, element)
			if (match) {
				emitter.emit('data', {
					before: change.old_val
						? jsonSchema.filter(schema, change.old_val) || {}
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
}
