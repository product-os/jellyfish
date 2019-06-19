/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const deepCopy = require('deep-copy')
const assert = require('../assert')
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const permissionFilter = require('./permission-filter')
const logger = require('../logger').getLogger(__filename)

const forEachObjectProperty = (object, fn, root = []) => {
	for (const [ key, value ] of Object.entries(object)) {
		const path = root.concat([ key ])
		if (_.isPlainObject(value)) {
			forEachObjectProperty(value, fn, path)
		} else {
			fn(path, value)
		}
	}
}

const preUpsert = async (instance, context, session, card) => {
	if (typeof card.name !== 'string') {
		Reflect.deleteProperty(card, 'name')
	}

	assert.INTERNAL(context, card.type,
		instance.errors.JellyfishSchemaMismatch, 'No type in card')

	const typeCard = await instance.getCardBySlug(
		context, session, card.type, {
			type: 'type',
			writeMode: true
		})

	const schema = typeCard && typeCard.data && typeCard.data.schema
	assert.INTERNAL(context, schema,
		instance.errors.JellyfishUnknownCardType,
		`Unknown type: ${card.type}`)

	try {
		jsonSchema.validate(schema, card)
	} catch (error) {
		if (error instanceof errors.JellyfishSchemaMismatch) {
			error.expected = true
		}

		throw error
	}

	const filter = await permissionFilter.getQuery(
		context, instance.backend, session, null, {
			writeMode: true
		})

	jsonSchema.validate(filter, card)
	return filter
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

		await Promise.all([
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

		assert.INTERNAL(context, id,
			errors.JellyfishInvalidId, 'Id is undefined')

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

		assert.INTERNAL(context, results.length <= 1,
			errors.JellyfishDatabaseError,
			`More than one card with id ${id}`)

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

		assert.INTERNAL(context, slug,
			errors.JellyfishInvalidSlug, 'Slug is undefined')

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

		assert.INTERNAL(context, results.length <= 1,
			errors.JellyfishDatabaseError,
			`More than one card with id slug ${slug}`)

		return results[0] || null
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
	 * const card = await kernel.insertCard(
	 *   '4a962ad9-20b5-4dd8-a707-bf819593cc84', { ... })
   * console.log(card.id)
   */
	async insertCard (context, session, object, options = {}) {
		const card = this.defaults(object)
		const filter = await preUpsert(this, context, session, card)

		if (options.override) {
			// Get the raw element from the backend
			const element = card.id
				? await this.backend.getElementById(context, card.id, {
					type: card.type
				})
				: await this.backend.getElementBySlug(context, card.slug, {
					type: card.type
				})

			if (element) {
				// Filter the element to see which fields (if any) are
				// unavailable to the user
				const userFilteredExistingCard = jsonSchema.filter(
					filter, deepCopy(element))

				// Preserve properties that we don't have access to
				forEachObjectProperty(element, (key, value) => {
					if (!_.has(userFilteredExistingCard, key)) {
						_.set(card, key, value)
					}
				})
			}
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
		const filteredQuery = await permissionFilter.getQuery(
			context, this.backend, session, schema, {
				writeMode: options.writeMode
			})

		return this.backend.query(context, filteredQuery, {
			limit: options.limit,
			skip: options.skip,
			sortBy: options.sortBy,
			sortDir: options.sortDir
		})
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
	 * @summary Lock a card
	 * @function
	 * @public
	 *
	 * @description
	 * It means that the owner has exclusive access on the slug.
	 *
	 * @param {String} context - context
	 * @param {String} session - session
	 * @param {String} owner - owner
	 * @param {Object} card - card
	 * @returns {(String|Null)} the locked slug
	 *
	 * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const owner = '9af7cf33-1a29-4f0c-a73b-f6a2b149850c'
	 *
	 * if (await kernel.lock(context, session, owner, {
	 *   slug: 'foobar',
	 *   ...
	 * })) {
	 *   console.log('Got the lock!')
	 * }
	 */
	async lock (context, session, owner, card) {
		if (!await this.getCardBySlug(context, session, card.slug)) {
			return null
		}

		return this.backend.lock(context, owner, card)
	}

	/**
	 * @summary Unlock a card
	 * @function
	 * @public
	 *
	 * @param {String} context - context
	 * @param {String} session - session
	 * @param {String} owner - owner
	 * @param {Object} card - card
	 * @returns {(String|Null)} the locked slug
	 *
	 * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const owner = '9af7cf33-1a29-4f0c-a73b-f6a2b149850c'
	 *
	 * if (await kernel.lock(context, session, owner, {
	 *   slug: 'foobar',
	 *   ...
	 * })) {
	 *   console.log('Got the lock!')
	 *
	 *   if (await kernel.unlock(context, session, owner, {
	 *     slug: 'foobar',
	 *     ...
	 *   })) {
	 *     console.log('Unlock!')
	 *   }
	 * }
	 */
	async unlock (context, session, owner, card) {
		if (!await this.getCardBySlug(context, session, card.slug)) {
			return null
		}

		return this.backend.unlock(context, owner, card)
	}
}
