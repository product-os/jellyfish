/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const assert = require('./assert')
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const permissionFilter = require('./permission-filter')
const logger = require('../logger').getLogger(__filename)
const {
	deepEqual
} = require('fast-equals')
const isObj = require('isobj')

const flattenObjectKeysIterator = (object, prefix, flattened) => {
	const keys = Object.keys(object)

	for (let index = 0; index < keys.length; index++) {
		const key = keys[index]
		const val = object[key]

		if (isObj(val)) {
			flattenObjectKeysIterator(val, `${prefix}${key}.`, flattened)
			continue
		}

		flattened.push(prefix + key)
	}
}

const flattenObjectKeys = (object) => {
	const result = []
	flattenObjectKeysIterator(object, '', result)
	return result
}

/**
 * @summary Gets the timestamp of when an element was created
 * @function
 * @private
 *
 * @param {Object} context - execution context
 * @param {Object} backend - backend
 * @param {Object} card - card
 * @returns {String} timestamp
 *
 * @example
 * const timestamp = await getElementCreatedTime(backend, {
 *   ...
 * })
 *
 * console.log(timestamp)
 */
const getElementCreatedTime = async (context, backend, card) => {
	if (card.created_at) {
		return card.created_at
	}

	// If a timestamp can't be resolved, create a new one
	return new Date().toISOString()
}

module.exports = class Kernel {
	/**
   * @summary The Jellyfish Kernel
   * @class
   * @public
   *
   * @param {Object} backend - the backend instance
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
   *
   * const kernel = new Kernel(backend)
   */
	constructor (backend) {
		this.backend = backend
		this.errors = errors
		this.cards = CARDS
	}

	/**
   * @summary Disconnect
   * @function
   * @public
	 *
	 * @param {Object} context - execution context
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   * await kernel.disconnect()
   */
	async disconnect (context) {
		await this.backend.disconnect(context)
	}

	/**
   * @summary Initialize the kernel
   * @function
   * @public
	 *
	 * @param {Object} context - execution context
	 *
	 * @returns {Promise}
   *
   * @description
   * This makes sure the kernel is connected to the backend
   * and that the backend is populated with the things we need.
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   */
	async initialize (context) {
		await this.backend.connect(context)

		logger.debug(context, 'Upserting minimal required cards')
		const unsafeUpsert = (card) => {
			const element = this.defaults(card)
			return permissionFilter.unsafeUpsertCard(context, this.backend, element)
		}

		await Promise.all([
			unsafeUpsert(CARDS.type),
			unsafeUpsert(CARDS.session),
			unsafeUpsert(CARDS.user),
			unsafeUpsert(CARDS['view-read-user-admin'])
		])

		const adminUser = await unsafeUpsert(CARDS['user-admin'])
		const adminSession = await unsafeUpsert({
			slug: 'session-admin-kernel',
			type: 'session',
			data: {
				actor: adminUser.id
			}
		})

		this.sessions = {
			admin: adminSession.id
		}

		return Promise.all([
			CARDS.card,
			CARDS.action,
			CARDS['action-request'],
			CARDS.org,
			CARDS.event,
			CARDS.view,
			CARDS.link
		].map(async (card) => {
			logger.debug(context, 'Upserting core card', {
				slug: card.slug
			})
			return this.insertCard(context, this.sessions.admin, card, {
				override: true
			})
		}))
	}

	/**
   * @summary Get a card by its id
   * @function
   * @public
   *
	 * @param {Object} context - execution context
   * @param {String} session - session id
   * @param {String} id - card id
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {String} [options.type] - card type, if known
   * @returns {(Object|Null)} card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = await kernel.getCard('...', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
   *
   * if (card) {
   *   console.log(card)
   * }
   */
	async getCardById (context, session, id, options = {}) {
		logger.debug(context, 'Fetching card by id', {
			id
		})

		assert.ok(id, 'Id is undefined')

		const schema = options.type ? {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id
				},
				type: {
					type: 'string',
					const: options.type
				}
			},
			additionalProperties: true,
			required: [ 'id', 'type' ]
		} : {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id
				}
			},
			additionalProperties: true,
			required: [ 'id' ]
		}

		const results = await this.query(context, session, schema, {
			writeMode: options.writeMode,
			limit: 1
		})

		assert.ok(results.length <= 1, `More than one card with id ${id}`)
		return results[0] || null
	}

	/**
   * @summary Get a card by its slug
   * @function
   * @public
   *
	 * @param {Object} context - execution context
   * @param {String} session - session id
   * @param {String} slug - card slug
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {String} [options.type] - card type, if known
   * @returns {(Object|Null)} card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = await kernel.getCard('...', 'foobar')
   *
   * if (card) {
   *   console.log(card)
   * }
   */
	async getCardBySlug (context, session, slug, options = {}) {
		logger.debug(context, 'Fetching card by slug', {
			slug
		})

		assert.ok(slug, 'Slug is undefined')

		const schema = options.type ? {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string',
					const: options.type
				}
			},
			additionalProperties: true,
			required: [ 'slug', 'type' ]
		} : {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: slug
				}
			},
			additionalProperties: true,
			required: [ 'slug' ]
		}

		const results = await this.query(context, session, schema, {
			writeMode: options.writeMode,
			limit: 1
		})

		assert.ok(results.length <= 1, `More than one card with slug ${slug}`)
		return results[0] || null
	}

	/**
   * @summary Get a set of elements by ids
   * @function
   * @public
   *
	 * @param {Object} context - execution context
	 * @param {String} session - session
   * @param {String[]} ids - ids
	 * @param {Object} options - options
	 * @param {String} options.type - element type
   * @returns {Object[]} cards
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
	 * const cards = await kernel.getCardsById([ '...' ], {
	 *   type: 'card'
	 * })
   *
   * console.log(cards[0])
   */
	async getCardsById (context, session, ids, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(context, this.backend, session, null, {
			writeMode: options.writeMode
		})

		if (!options.type) {
			throw new errors.JellyfishNoType(`No type when getting elements by id: ${ids}`)
		}

		logger.debug(context, 'Fetching cards by id', {
			ids
		})

		const result = await this.backend.getElementsById(context, ids, options)
		return jsonSchema.filter(filteredQuery, result)
	}

	/**
   * @summary Insert a card to the kernel
   * @function
   * @protected
   *
	 * @param {Object} context - execution context
   * @param {String} session - session id
   * @param {Object} object - card object
   * @param {Object} [options] - options
   * @param {Boolean} [options.override=false] - override existing card
   * @returns {Object} the inserted card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = await kernel.insertCard('4a962ad9-20b5-4dd8-a707-bf819593cc84', { ... })
   * console.log(card.id)
   */
	async insertCard (context, session, object, options = {}) {
		const card = this.defaults(object)

		if (typeof card.name !== 'string') {
			Reflect.deleteProperty(card, 'name')
		}

		if (!card.type) {
			throw new this.errors.JellyfishSchemaMismatch('No type in card')
		}

		const typeCard = await this.getCardBySlug(context, session, card.type, {
			type: 'type',
			writeMode: true
		})

		const schema = typeCard && typeCard.data && typeCard.data.schema
		if (!schema) {
			throw new this.errors.JellyfishUnknownCardType(`Unknown type: ${card.type}`)
		}

		jsonSchema.validate(schema, card)

		// We only apply the write filters if attempting to modify
		// a card. Otherwise, we assume that you have enough permissions
		// to create a card if you have access to its type.
		if (options.override) {
			// The 'schema' argument doesn't need to be used here as we already
			// validated against it, and it causes odd behaviour on the immutable key
			// logic below, as fields that are not defined on a type card end up
			// appearing in the key diff and are treated as immutable.
			// TODO: When evaluating against a type card schema, merge it with the
			// "card" type so that it inherits default fields
			const filter = await permissionFilter.getQuery(context, this.backend, session, null, {
				writeMode: true
			})

			jsonSchema.validate(filter, card)

			if (card.id || card.slug) {
				// Get the raw element from the backend
				const element = card.id
					? await this.backend.getElementById(context, card.id, {
						type: card.type
					})
					: await this.backend.getElementBySlug(context, card.slug, {
						type: card.type
					})

				if (element) {
					if (element.name === null) {
						Reflect.deleteProperty(element, 'name')
					}

					if (_.isEqual(
						_.omit(element, [ 'created_at', 'updated_at', 'linked_at', 'links' ]),
						_.omit(card, [ 'created_at', 'updated_at', 'linked_at', 'links' ])
					)) {
						return null
					}

					card.created_at = await getElementCreatedTime(context, this.backend, element)

					// Modify the `updated_at` field to signify that the card has changed
					card.updated_at = new Date().toISOString()

					// The links attribute cannot be modified at the kernel level
					card.links = element.links

					// The linked_at attribute cannot be modified at the kernel level
					card.linked_at = element.linked_at

					// Filter the element to see which fields (if any) are unavailable to
					// the user
					filter.additionalProperties = true

					const userFilteredExistingCard = jsonSchema.filter(filter, _.cloneDeep(element))

					// Check if there is any difference due to permissions
					if (userFilteredExistingCard && !deepEqual(element, userFilteredExistingCard)) {
						// Find all the keys that exist on the raw element but not on the
						// filtered element. These are fields that the user can't see or
						// modify
						const immutableDataKeys = _.difference(
							flattenObjectKeys(element),
							flattenObjectKeys(userFilteredExistingCard)
						)

						// Ensure that all immutable keys and values are present on the card
						// before it is inserted
						_.forEach(immutableDataKeys, (keypath) => {
							_.set(card, keypath, _.get(element, keypath))
						})
					}
				}
			}
		} else {
			// The links attribute cannot be set when inserting a card
			card.links = {}
		}

		if (options.override) {
			logger.debug(context, 'Upserting card', {
				slug: card.slug
			})
		} else {
			logger.debug(context, 'Inserting card', {
				slug: card.slug
			})
		}

		const result = options.override
			? await this.backend.upsertElement(context, card)
			: await this.backend.insertElement(context, card)

		return result
	}

	/**
   * @summary Query the kernel
   * @function
   * @public
   *
   * @param {Object} context - execution context
	 * @param {String} session - session id
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {Number} [options.limit] - query limit
	 * @param {Number} [options.skip] - skip
	 * @param {String | String[]} [options.sortBy] - Key or key path as an array to
	 *   a value that the query should be sorted by
	 * @param {'asc' | 'desc'} [options.sortDir] - Set sort direction,
   * @returns {Object[]} results
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const results = await kernel.query('4a962ad9-20b5-4dd8-a707-bf819593cc84', {
   *   type: 'object',
   *   properties: {
   *     slug: {
   *       type: 'string',
   *       const: 'foo'
   *     }
   *   },
   *   required: [ 'slug' ]
   * })
   */
	async query (context, session, schema, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(context, this.backend, session, schema, {
			writeMode: options.writeMode
		})

		const queryOptions = {
			limit: options.limit,
			skip: options.skip,
			sortBy: options.sortBy,
			sortDir: options.sortDir,
			mask: await permissionFilter.getQuery(context, this.backend, session, null, {
				writeMode: options.writeMode
			})
		}

		return this.backend.query(context, filteredQuery, queryOptions)
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
	 * @param {String} session - session id
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
   * @returns {EventEmitter} emitter
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const emitter = await kernel.stream('4a962ad9-20b5-4dd8-a707-bf819593cc84', {
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
	async stream (context, session, schema, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(context, this.backend, session, schema, {
			writeMode: options.writeMode
		})

		logger.debug(context, 'Opening stream')
		return this.backend.stream(context, filteredQuery)
	}

	/**
   * @summary Extends a card with default values
   * @function
   * @public
   *
   *
   * @param {Object} card - card
   * @returns {Object} card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = kernel.defaults({
   *   slug: 'slug',
   *   type: 'type'
   * })
   *
   * console.log(card)
   */
	// eslint-disable-next-line class-methods-use-this
	defaults (card) {
		// Object.assign is used as it is significantly faster than using lodash
		const defaultCard = Object.assign({
			updated_at: null,
			linked_at: {},
			active: true,
			version: '1.0.0',
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			data: {}
		}, card)

		// Only create a timestamp if it's necessary
		if (!defaultCard.created_at) {
			defaultCard.created_at = new Date().toISOString()
		}

		return defaultCard
	}

	/**
   * @summary Report status from the kernel
   * @function
   * @public
	 *
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * @returns {Object} status
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
   * const status = await kernel.getStatus()
	 * console.log(status)
   */
	async getStatus () {
		return {
			backend: await this.backend.getStatus()
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
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * if (await kernel.lock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *   console.log('Got the lock!')
	 * }
	 */
	async lock (owner, slug) {
		return this.backend.lock(owner, slug)
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
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * if (await kernel.lock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *   console.log('Got the lock!')
	 *
	 *   if (await kernel.unlock('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'foobar')) {
	 *     console.log('Unlock!')
	 *   }
	 * }
	 */
	async unlock (owner, slug) {
		return this.backend.unlock(owner, slug)
	}

	/**
	 * @summary Get pending action requests from the queue
	 * @function
	 * @public
	 *
	 * @param {Object} context - context
	 * @param {String} session - session
	 * @param {Object} [options] - options
	 * @param {Number} [options.skip] - query skip
	 * @param {Number} [options.limit] - query limit
	 * @returns {Object[]} requests
	 */
	async getPendingRequests (context, session, options = {}) {
		const mask = await permissionFilter.getQuery(
			context, this.backend, session, null, {
				writeMode: false
			})
		return this.backend.getPendingRequests(context, {
			limit: options.limit,
			skip: options.skip,
			mask
		})
	}
}
