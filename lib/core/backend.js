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
const logger = require('../logger').getLogger('jellyfish:backend')
const Bluebird = require('bluebird')
const reqlSchema = require('reql-schema')
const skhema = require('skhema')
const uuid = require('uuid/v4')
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

const createTableStream = async (backend, table, schema, ctx) => {
	skhema.validate(schema, null, {
		schemaOnly: true
	})

	const emitter = new EventEmitter()

	logger.debug(ctx, `Opening stream in table ${table}`)
	const cursor = await reqlSchema(backend.database, table, schema)
		.changes()
		.run(backend.connection)

	emitter.close = () => {
		logger.debug(ctx, `Closing stream in table ${table}`)

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

	cursor.each(async (error, change) => {
		if (error) {
			emitter.close()
			cursor.close(() => {
				emitter.emit('error', error)
			})

			return
		}

		let newMatch = skhema.filter(schema, change.new_val)
		let oldMatch = skhema.filter(schema, change.old_val)

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
	}, () => {
		cursor.close(() => {
			emitter.emit('closed')
		})
	})

	return emitter
}

const queryTable = async (backend, table, schema, options) => {
	logger.debug(options.ctx, `Querying entries in table ${table}`)

	let query = await reqlSchema(backend.database, table, schema)

	if (options.sortBy) {
		let rethinkRowSelector = rethinkdb.row

		for (const key of _.castArray(options.sortBy)) {
			rethinkRowSelector = rethinkRowSelector(key)
		}

		// The r.orderBy() function defaults to ascending, so it only needs to be
		// modified if the direction is explicitly 'desc'
		if (options.sortDir === 'desc') {
			rethinkRowSelector = rethinkdb.desc(rethinkRowSelector)
		}

		query = query.orderBy(rethinkRowSelector)
	} else {
		// Default to sorting by timestamp
		query = query.orderBy(rethinkdb.row('data')('timestamp'))
	}

	if (options.skip) {
		query = query.skip(options.skip)
	}

	if (options.limit) {
		query = query.limit(options.limit)
	}

	const cursor = await query.run(backend.connection)
	const elements = await Bluebird.map(await cursor.toArray(), async (card) => {
		return resolveLinks(backend, schema, options, card)
	}, {
		concurrency: 3
	})

	return skhema.filter(schema, _.compact(elements))
}

const resolveLinks = async (backend, schema, options, card) => {
	const result = await links.evaluateCard({
		query: options.subquery || backend.query.bind(backend)
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

const getElementByIdFromTable = async (backend, table, id, ctx) => {
	logger.debug(ctx, `Getting element by id ${id} from table ${table} in database ${backend.database}`)

	let cursor = null
	try {
		cursor = await rethinkdb
			.db(backend.database)
			.table(table)
			.getAll(id, {
				index: 'id'
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

const getElementBySlugFromTable = async (backend, table, slug, ctx) => {
	logger.debug(ctx, `Getting element by slug ${slug} from table ${table} in database ${backend.database}`)
	let result = null
	try {
		result = await rethinkdb
			.db(backend.database)
			.table(table)
			.get(slug)
			.run(backend.connection)
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
	if (insertedObject.links) {
		insertedObject.links = options.links || {}
	}

	const elementId = uuid()

	// Its very important, for concurrency issues, that inserts/upserts
	// remain atomic, in that there is only one atomic request sent to
	// the database. We were previously violating this principle by
	// querying the database before proceeding with the insertion.
	const results = options.replace
		? await rethinkdb
			.db(backend.database)
			.table(table)
			.get(insertedObject.slug)
			.replace((element) => {
				return rethinkdb.branch(
					element.eq(null),
					rethinkdb.expr(insertedObject).merge({
						id: rethinkdb.literal(elementId)
					}),
					rethinkdb.expr(insertedObject).merge({
						id: element('id')
					}))
			}, {
				returnChanges: 'always'
			})
			.run(backend.connection)
		: await rethinkdb
			.db(backend.database)
			.table(table)
			.insert(Object.assign(insertedObject, {
				id: elementId
			}), {
				returnChanges: true
			})
			.run(backend.connection)

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
			fromCard: backend.getElementById(insertedObject.data.from),
			toCard: backend.getElementById(insertedObject.data.to)
		})

		// The reversed array is used so that links are parsed in both directions
		await Bluebird.map([
			[ fromCard, toCard ],
			[ toCard, fromCard ]
		], async (cards) => {
			if (!cards[0] || !cards[1]) {
				return
			}

			await upsertObject(backend, getBucketForType(cards[0].type), cards[0], {
				links: fn(insertedObject, ...cards).links,
				replace: true,
				unsetFromCache: true
			})
		})
	}

	return insertedObject
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
   * await backend.reset()
   */
	async reset (ctx) {
		const tables = await this.getTables()
		await Promise.all(tables.map((table) => {
			logger.debug(ctx, `Dropping table ${table}`)
			return rethinkdb
				.db(this.database)
				.tableDrop(table)
				.run(this.connection)
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
		const connection = await rethinkdb.connect(this.options)
		logger.debug(ctx, 'Destroying the database')

		await rethinkdb.dbDrop(this.database).run(connection)
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
			logger.debug(ctx, 'Connecting to database')
			this.connection = await rethinkdb.connect(this.options)
		}

		logger.debug(ctx, 'Querying database list')
		const databases = await rethinkdb
			.dbList()
			.run(this.connection)

		if (!databases.includes(this.database)) {
			logger.debug(ctx, `Creating database ${this.database}`)
			if (this.cache) {
				await this.cache.reset()
			}

			await rethinkdb
				.dbCreate(this.database)
				.run(this.connection)
		}

		// Prevent sporadic replica error:
		//   Cannot perform read: primary replica for shard ["", +inf) not available]
		// See https://github.com/rethinkdb/rethinkdb/issues/6160
		await rethinkdb.db(this.database).wait().run(this.connection)

		for (const table of await this.getTables(ctx)) {
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
			await this.createTable(table, ctx)

			// Lets make sure the table is ready before continuing
			await rethinkdb
				.db(this.database)
				.table(table)
				.wait()
				.run(this.connection)

			await rethinkdb
				.db(this.database)
				.table(table)
				.indexCreate('id')
				.run(this.connection)

			// Wait for all indexes to be ready
			await rethinkdb
				.db(this.database)
				.table(table)
				.indexWait()
				.run(this.connection)
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
			connection
		} = this
		if (connection) {
			this.connection = null
			logger.debug(ctx, 'Disconnecting from database')

			_.forEach(this.openStreams, (stream, id) => {
				stream.close()
				Reflect.deleteProperty(this.openStreams, id)
			})

			await connection.close()
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
		logger.debug(ctx, 'Querying table list')
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
			logger.debug(ctx, `Creating table ${name} in database ${this.database}`)
			await rethinkdb
				.db(this.database)
				.tableCreate(name, {
					primaryKey: 'slug'
				})
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
		logger.debug(ctx, `Inserting element to table ${table} in database ${this.database}`)
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
		logger.debug(ctx, `Updating element ${object.slug} in table ${table} in database ${this.database}`)
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
	 *   type: 'test'
	 * })
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementById (id, options = {}) {
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
				for (const bucket of ALL_BUCKETS) {
					if (bucket === table) {
						await this.cache.set(bucket, result)
					} else {
						await this.cache.setMissingId(bucket, id)
					}
				}

				await this.cache.set(table, result)
			} else {
				await this.cache.setMissingId(table, id)
			}
		}

		return result
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
	 *   type: 'test'
	 * })
   *
   * console.log(element.data)
   * > 'foo'
   */
	async getElementBySlug (slug, options = {}) {
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
				for (const bucket of ALL_BUCKETS) {
					if (bucket === table) {
						await this.cache.set(bucket, result)
					} else {
						await this.cache.setMissingSlug(bucket, slug)
					}
				}
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
   * @param {Object} schema - JSON Schema
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
	async query (schema, options = {}) {
		if ((schema.properties.id && schema.properties.id.const) || (schema.properties.slug && schema.properties.slug.const)) {
			if (options.skip || options.limit === 0) {
				return []
			}

			// Performance shortcut
			let element = null

			if (schema.properties.id && schema.properties.id.const) {
				element = await this.getElementById(schema.properties.id.const, {
					ctx: options.ctx
				})
			} else if (schema.properties.slug && schema.properties.slug.const) {
				element = await this.getElementBySlug(schema.properties.slug.const, {
					ctx: options.ctx
				})
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

			const elementWithLinks = await resolveLinks(this, schema, options, _.cloneDeep(element))

			return _.compact([ skhema.filter(schema, elementWithLinks) ])
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
	async stream (schema, ctx) {
		const tables = getBucketsForSchema(schema)

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
