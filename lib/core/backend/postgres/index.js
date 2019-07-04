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
const assert = require('../../../assert')
const jsonschema2sql = require('./jsonschema2sql')
const links = require('./links')
const cards = require('./cards')
const streams = require('./streams')
const utils = require('./utils')
const markers = require('./markers')

// By default pg-promise will convert timestamptz fields into Javascript Date
// objects. It is preferrable to keep these as strings and format them so that
// they match the expected format for JSON schema "date-time".
// This is represented by RFC3339 ( https://json-schema.org/latest/json-schema-validation.html#RFC3339 )
// a subset of ISO8601.
// Here, the type parser for timestamp fields is set to a function that will
// cheaply format the timestamp.
// This is done by tapping into the underlying PG library and setting the
// timestamp parser.
// The OID value is gathered from
// https://github.com/brianc/node-pg-types/blob/master/lib/builtins.js#L48
const TIMESTAMP_OID = 1114

const rfcStampParser = (timestamp) => {
	if (!timestamp) {
		return null
	}

	// A very simple check to see if the timestamp is already RFC3339 format
	if (timestamp.length === 24 && timestamp.charAt(23) === 'Z') {
		return timestamp
	}

	// Append a 'Z' suffix to indicate a zero hour offset, then call toJSON to get
	// an RFC3339 timestamp. Omitting the 'Z' suffix can lead to unexpected results,
	// as the Date constructor will attempt to convert the timestamp from local
	// time to UTC.
	return new Date(`${timestamp}Z`).toJSON()
}

pgp.pg.types.setTypeParser(TIMESTAMP_OID, rfcStampParser)

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

	const preProcessingStartDate = new Date()
	const config = _.defaults(options, {
		sortBy: [ 'data', 'timestamp' ],

		// Exclude converting additionalProperties to SQL, as its used for field
		// filtering rather than record selection and will typically break the
		// generated SQL query, causing no results to be returned
		exclude: [ 'additionalProperties' ]
	})

	const query = jsonschema2sql(table, schema, config)

	const queryStartDate = new Date()
	const results = await backend.connection.any(query)
	const queryEndDate = new Date()

	const elements = results.map((element) => {
		for (const linkType of Object.keys(schema.$$links || {})) {
			if (!schema.$$links[linkType]) {
				continue
			}

			const linkSlug = links.getLinkTypeSlug(linkType)
			const linkSchema = schema.$$links[linkType]

			if (!element.links) {
				element.links = {}
			}

			element.links[linkType] = utils.filter(
				linkSchema,
				element[`links.${linkSlug}`]
			)

				// Since JSONSchema2sql attaches the link data as a JSONB aggregate, the
				// type parsing behaviour of node-pg is skipped. As a result we now have
				// to fixup the timestamp columns so that they are uniform with the rest
				// of the data. This happens because by default Postgres formats
				// timestamps in jsonb as an ISO8601 stamp *without* the Z suffix. See
				// https://dba.stackexchange.com/questions/196809/why-does-jsonb-show-a-different-date-format-than-javascript
				// for a neat explanation of this behaviour
				// TODO: Make this more elegant!
				.map((item) => {
					if (item.created_at) {
						item.created_at = rfcStampParser(item.created_at)
					}
					if (item.updated_at) {
						item.updated_at = rfcStampParser(item.updated_at)
					}
					return item
				})

			Reflect.deleteProperty(element, `links.${linkSlug}`)
		}

		return element
	})

	const result = utils.filter(schema, elements)
	const postProcessingEndDate = new Date()

	logger.debug(context, 'Query database response', {
		table,
		database: backend.database,
		count: result.length,
		queryTime: queryEndDate.getTime() - queryStartDate.getTime(),
		preProcessingTime: queryStartDate.getTime() - preProcessingStartDate.getTime(),
		postProcessingTime: postProcessingEndDate.getTime() - queryEndDate.getTime()
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
				context,
				backend.errors,
				backend.connection,
				updatedCard
			)
			if (backend.cache) {
				await backend.cache.unset(updatedCard)
			}
		})
	}

	/*
	 * Only update the markers view if needed, for performance reasons.
	 */
	if (insertedObject.type === 'user' || insertedObject.type === 'org' ||
			(insertedObject.type === 'link' &&
				(insertedObject.data.from.type === 'org' ||
					insertedObject.data.to.type === 'org'))) {
		logger.info(context, 'Triggering markers refresh', {
			type: insertedObject.type,
			slug: insertedObject.slug,
			database: backend.database
		})

		await markers.refresh(context, backend.connection, {
			source: cards.TABLE
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

		await Bluebird.all([
			cards.setup(context, this.connection, this.database)
		])

		await links.setup(context, this.connection, this.database, {
			cards: cards.TABLE
		})

		await Bluebird.all([
			markers.setup(context, this.connection, {
				source: cards.TABLE,
				links: links.TABLE
			})
		])

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
	 * Reset the database state.
	 */
	async reset (context) {
		logger.debug(context, 'Resetting database', {
			database: this.database
		})

		await this.connection.any(`
			DELETE FROM ${links.TABLE};
			DELETE FROM ${cards.TABLE};
		`)
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
		assert.INTERNAL(context, options.type,
			this.errors.JellyfishNoIdentifier,
			`No type when getting element by id: ${id}`)

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
		assert.INTERNAL(context, options.type,
			this.errors.JellyfishNoIdentifier,
			`No type when getting element by slug: ${slug}`)

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
		assert.INTERNAL(context, options.type,
			this.errors.JellyfishNoIdentifier,
			`No type when getting elements by id: ${ids}`)

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
		/*
		 * These optimization detection conditionals are very weak
		 * and very easy to miss even if expressing the same query
		 * with a slightly different schema. Hopefully we invest
		 * more time to make this detection way smarter.
		 */

		// Optimize queries for orgs that a user belongs to
		if (schema.type === 'object' &&
			schema.properties &&
			schema.properties.type &&
			schema.properties.type.const === 'org' &&
			schema.properties.slug &&
			!schema.properties.slug.const &&
			Object.keys(schema.properties).length === 2 &&
			schema.$$links &&
			schema.$$links['has member'] &&
			schema.$$links['has member'].properties &&
			schema.$$links['has member'].properties.type &&
			schema.$$links['has member'].properties.type.const === 'user' &&
			schema.$$links['has member'].properties.slug &&
			schema.$$links['has member'].properties.slug.const) {
			return markers.getUserMarkers(
				context,
				this.connection, {
					slug: schema.$$links['has member'].properties.slug.const
				}, {
					source: cards.TABLE
				})
		}

		const realSchema = defaultAdditionalPropertiesFalse(schema)
		const results = await queryTable(
			context, this, cards.TABLE, realSchema, options)
		return results
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
			},
			middlewares: [
				// We need to format the timestamps into RFC3339 values here
				// TODO: Make this more elegant!
				(payload) => {
					const {
						before,
						after
					} = payload

					if (after) {
						if (after.created_at) {
							after.created_at = rfcStampParser(after.created_at)
						}
						if (after.updated_at) {
							after.updated_at = rfcStampParser(after.updated_at)
						}
					}

					if (before) {
						if (before.created_at) {
							before.created_at = rfcStampParser(before.created_at)
						}
						if (before.updated_at) {
							before.updated_at = rfcStampParser(before.updated_at)
						}
					}

					return payload
				}
			]
		})
	}

	/*
	 * Returns a free form object with information about
	 * this backend instance.
	 */
	async getStatus () {
		return {
			streams: {
				waiting: this.streamClient.getWaitingCount()
			}
		}
	}
}
