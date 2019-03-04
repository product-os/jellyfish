/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const pgp = require('pg-promise')()
const Bluebird = require('bluebird')
const skhema = require('skhema')
const logger = require('../../../logger').getLogger(__filename)
const jellyscript = require('../../../jellyscript')
const jsonschema2sql = require('./jsonschema2sql')
const links = require('./links')
const locks = require('./locks')
const cards = require('./cards')
const streams = require('./streams')

const SORT_KEY = '$$sort'

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

const queryTable = async (context, backend, table, schema, options) => {
	logger.debug(context, 'Querying from table', {
		table,
		database: backend.database,
		limit: options.limit,
		skip: options.skip,
		sortBy: options.sortBy
	})

	if (options.limit <= 0) {
		return []
	}

	const config = _.defaults(options, {
		sortBy: [ 'data', 'timestamp' ],

		// Exclude converting additionalProperties to SQL, as its used for field
		// filtering rather than record selection and will typically break the
		// generated SQL query, causing no results to be returned
		exclude: [ 'additionalProperties' ]
	})

	const query = jsonschema2sql(table, schema, config)
	const results = await backend.connection.any(query)

	const elements = results.map((element) => {
		if (element.links) {
			element.links = {}
		}

		for (const linkType of Object.keys(schema.$$links || {})) {
			if (!schema.$$links[linkType]) {
				continue
			}

			const linkSlug = links.getLinkTypeSlug(linkType)
			const linkSchema = options.mask
				? skhema.merge([
					schema.$$links[linkType],
					options.mask
				])
				: schema.$$links[linkType]

			if (!element.links) {
				element.links = {}
			}

			element.links[linkType] =
				filter(linkSchema, element[`links.${linkSlug}`]).map((subelement) => {
					if (subelement.links) {
						subelement.links = {}
					}

					return subelement
				})

			Reflect.deleteProperty(element, `links.${linkSlug}`)
		}

		return element
	})

	const result = filter(schema, elements)

	logger.debug(context, 'Query database response', {
		table,
		database: backend.database,
		count: result.length
	})

	return result
}

const upsertObject = async (context, backend, object, options) => {
	const insertedObject = await cards.upsert(
		context, backend.errors, backend.connection, object, {
			replace: options.replace
		})

	if (backend.cache) {
		await backend.cache.set(cards.TABLE, insertedObject)
	}

	if (insertedObject.type === 'link') {
		await links.upsert(context, backend.connection, insertedObject)

		// TODO: We only "materialize" links in this way because we haven't
		// come up with a better way to traverse links while streaming.
		// Ideally we should leverage the database, using joins, rather
		// than doing all this client side.
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
		], async (linkCards) => {
			if (!linkCards[0] || !linkCards[1]) {
				return
			}

			const updatedCard = fn(insertedObject, ...linkCards)
			await cards.materializeLink(
				context, backend.errors, backend.connection, updatedCard, updatedCard.links)
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
			WHERE datistemplate = false;`), 'datname')

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
				CREATE DATABASE ${this.database} OWNER = ${this.options.user};`)

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

		await cards.setup(context, this.connection, this.database)
		await links.setup(context, this.connection, this.database, {
			cards: cards.TABLE
		})
		await locks.setup(context, this.connection, this.database)
		this.streamClient = await streams.setup(
			context, this.connection, cards.TABLE)
	}

	/*
	 * This method takes care of gracefully disconnecting from
	 * Postgres, and its mainly used during automated testing.
	 */
	async disconnect (context) {
		this.streamClient = await streams.teardown(
			context, this.connection, this.streamClient)

		/*
		 * Close the main connection pool.
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
		 * Lets first check the in-memory cache so we can avoid
		 * making a full-blown query to the database.
		 */
		if (this.cache) {
			const cacheResult = await this.cache.getById(cards.TABLE, id)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		/*
		 * Make a database request if we didn't have luck with
		 * the cache.
		 */
		const result = await cards.getById(context, this.connection, id)

		if (this.cache) {
			if (result) {
				/*
				 * If we found the element, then update the cache
				 * so we can fetch it from there next time.
				 */
				await this.cache.set(cards.TABLE, result)
			} else {
				/*
				 * If we didn't, then let the cache know that this
				 * id doesn't exist on that table, so that we can
				 * also avoid another query in vain in the future.
				 */
				await this.cache.setMissingId(cards.TABLE, id)
			}
		}

		return result || null
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
		 * Lets first check the in-memory cache so we can avoid
		 * making a full-blown query to the database.
		 */
		if (this.cache) {
			const cacheResult = await this.cache.getBySlug(
				cards.TABLE, slug)
			if (cacheResult.hit) {
				return cacheResult.element
			}
		}

		/*
		 * Make a database request if we didn't have luck with
		 * the cache.
		 */
		const result = await cards.getBySlug(context, this.connection, slug)

		if (this.cache) {
			if (result) {
				/*
				 * If we found the element, then update the cache
				 * so we can fetch it from there next time.
				 */
				await this.cache.set(cards.TABLE, result)
			} else {
				/*
				 * If we didn't, then let the cache know that this
				 * id doesn't exist on that table, so that we can
				 * also avoid another query in vain in the future.
				 */
				await this.cache.setMissingSlug(cards.TABLE, slug)
			}
		}

		return result || null
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
				const cacheResult = await this.cache.getById(
					cards.TABLE, id)
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
		const elements = await cards.getManyById(
			context, this.connection, uncached)

		if (this.cache) {
			/*
			 * Store the ones we found in the in-memory cache.
			 */
			for (const element of elements) {
				await this.cache.set(cards.TABLE, element)
				uncachedSet.delete(element.id)
			}

			/*
			 * Let the in-memory cache know about the ids that
			 * we know for sure don't exist in the requested
			 * table.
			 */
			for (const id of uncachedSet) {
				await this.cache.setMissingId(cards.TABLE, id)
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
		const sortExpression = realSchema[SORT_KEY]
		const results = await queryTable(
			context, this, cards.TABLE, realSchema, options)
		return sortExpression
			? jellyscript.sort(results, sortExpression)
			: results
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

		/*
		 * We first make sure that the schema is valid.
		 */
		skhema.validate(schema, null, {
			schemaOnly: true
		})

		return streams.attach(context, this.streamClient, schema, {
			// TODO: This is an abomination. These types of sub
			// queries and links injections passed to the streams
			// module shouldn't happen.
			links,
			subquery: (subcontext, ids, suboptions) => {
				return this.getElementsById(subcontext, ids, suboptions)
			}
		})
	}

	/*
	 * Returns a free form object with information about
	 * this backend instance.
	 */
	async getStatus () {
		return {
			queue: {
				backlog: await cards.getUnexecutedRequestsCount(this.connection)
			}
		}
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
		return locks.lock(this.connection, this.errors, owner, slug)
	}

	/*
	 * Release an exclusive lock on a slug given a session/actor.
	 *
	 * This method will return the slug if unblocking succeeded, which
	 * implies the calleer really owned the lock on the first place.
	 */
	async unlock (owner, slug) {
		return locks.unlock(this.connection, this.errors, owner, slug)
	}
}
