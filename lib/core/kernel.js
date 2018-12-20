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

const Bluebird = require('bluebird')
const _ = require('lodash')
const lockfile = require('proper-lockfile')
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

const waitForLock = async (retries = 0) => {
	try {
		const release = await lockfile.lock('./jellyfish-kernel.lock')
		return release
	} catch (error) {
		if (retries < 30) {
			await Bluebird.delay(1000)

			return waitForLock(retries + 1)
		}

		throw error
	}
}

/**
 * @summary Gets the timestamp of when an element was created
 * @function
 * @private
 *
 * @param {Object} backend - backend
 * @param {Object} card - card
 * @param {Object} ctx - execution context
 * @returns {String} timestamp
 *
 * @example
 * const timestamp = await getElementCreatedTime(backend, {
 *   ...
 * })
 *
 * console.log(timestamp)
 */
const getElementCreatedTime = async (backend, card, ctx) => {
	if (card.created_at) {
		return card.created_at
	}

	// If the card doesn't have a `created_at` field then it is an old card and
	// the related `create` card needs to be queried.
	const [ createCard ] = await backend.query(ctx, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'create'
			},
			data: {
				type: 'object',
				properties: {
					target: {
						type: 'string',
						const: card.id
					}
				},
				required: [ 'target' ]
			}
		},
		required: [ 'type', 'data' ]
	})

	if (createCard && createCard.data.timestamp) {
		return createCard.data.timestamp
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
	}

	/**
   * @summary Disconnect
   * @function
   * @public
	 *
	 * @param {Object} ctx - execution context
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   * await kernel.disconnect()
   */
	async disconnect (ctx) {
		await this.backend.disconnect(ctx)
	}

	/**
   * @summary Initialize the kernel
   * @function
   * @public
	 *
	 * @param {Object} ctx - execution context
	 * @param {Boolean} [holdLock=true] - whether to lock whilst bootstrapping the DB
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
	async initialize (ctx, holdLock = true) {
		if (holdLock) {
			const release = await waitForLock()
			await this.backend.connect(ctx)
			release()
		} else {
			await this.backend.connect(ctx)
		}

		// Built-in cards

		logger.debug(ctx, 'Upserting minimal required cards')
		const unsafeUpsert = (card) => {
			const element = this.defaults(card)

			return permissionFilter.unsafeUpsertCard(this.backend, element, ctx)
		}

		await Promise.all([
			unsafeUpsert(await CARDS.type),
			unsafeUpsert(await CARDS.session),
			unsafeUpsert(await CARDS.user),
			unsafeUpsert(await CARDS['view-read-user-admin'])
		])

		const adminUser = await unsafeUpsert(await CARDS['user-admin'])
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
			await CARDS.card,
			await CARDS.action,
			await CARDS['action-request'],
			await CARDS.event,
			await CARDS.view,
			await CARDS.link
		].map((card) => {
			logger.debug(ctx, `Upserting core card ${card.slug}`)
			return this.insertCard(this.sessions.admin, card, {
				override: true,
				ctx
			})
		}))
	}

	/**
   * @summary Get a card by its id
   * @function
   * @public
   *
   * @param {String} session - session id
   * @param {String} id - card id
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {String} [options.type] - card type, if known
	 * @param {Object} [options.ctx] - execution context
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
	async getCardById (session, id, options = {}) {
		logger.debug(options.ctx, 'Fetching card by id', {
			id
		})

		assert.ok(id, 'Id is undefined')

		if (!options.type) {
			logger.warn(options.ctx,
				'Unspecified type when getting element by id', {
					id
				})
		}

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

		const results = await this.query(session, schema, {
			writeMode: options.writeMode,
			limit: options.limit,
			ctx: options.ctx
		})

		assert.ok(results.length <= 1, `More than one card with id ${id}`)
		return results[0] || null
	}

	/**
   * @summary Get a card by its slug
   * @function
   * @public
   *
   * @param {String} session - session id
   * @param {String} slug - card slug
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {String} [options.type] - card type, if known
	 * @param {Object} [options.ctx] - execution context
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
	async getCardBySlug (session, slug, options = {}) {
		logger.debug(options.ctx, 'Fetching card by slug', {
			slug
		})

		assert.ok(slug, 'Slug is undefined')

		if (!options.type) {
			logger.warn(options.ctx,
				'Unspecified type when getting element by slug', {
					slug
				})
		}

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

		const results = await this.query(session, schema, {
			writeMode: options.writeMode,
			limit: options.limit,
			ctx: options.ctx
		})

		assert.ok(results.length <= 1, `More than one card with slug ${slug}`)
		return results[0] || null
	}

	/**
   * @summary Get a set of elements by ids
   * @function
   * @public
   *
	 * @param {String} session - session
   * @param {String[]} ids - ids
	 * @param {Object} options - options
	 * @param {String} options.type - element type
	 * @param {Object} [options.ctx] - execution context
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
	async getCardsById (session, ids, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(this.backend, session, null, {
			writeMode: options.writeMode,
			ctx: options.ctx
		})

		if (!options.type) {
			throw new errors.JellyfishNoIdentifier(`No type when getting elements by id: ${ids}`)
		}

		logger.debug(options.ctx, 'Fetching cards by id', {
			ids
		})

		const result = await this.backend.getElementsById(options.ctx, ids, options)
		return jsonSchema.filter(filteredQuery, result)
	}

	/**
   * @summary Insert a card to the kernel
   * @function
   * @protected
   *
   * @param {String} session - session id
   * @param {Object} object - card object
   * @param {Object} [options] - options
   * @param {Boolean} [options.override=false] - override existing card
	 * @param {Object} [options.ctx] - execution context
   * @returns {Object} the inserted card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = await kernel.insertCard('4a962ad9-20b5-4dd8-a707-bf819593cc84', { ... })
   * console.log(card.id)
   */
	async insertCard (session, object, options = {}) {
		const card = this.defaults(object)

		jsonSchema.validate((await CARDS.card).data.schema, card)

		const typeCard = await this.getCardBySlug(session, card.type, {
			type: 'type',
			writeMode: true,
			ctx: options.ctx
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
			const filter = await permissionFilter.getQuery(this.backend, session, null, {
				writeMode: true,
				ctx: options.ctx
			})

			jsonSchema.validate(filter, card)

			if (card.id || card.slug) {
				// Get the raw element from the backend
				const element = card.id
					? await this.backend.getElementById(options.ctx, card.id, {
						type: card.type
					})
					: await this.backend.getElementBySlug(options.ctx, card.slug, {
						type: card.type
					})

				if (element) {
					card.created_at = await getElementCreatedTime(this.backend, element, options.ctx)

					// The links attribute cannot be modified at the kernel level
					card.links = element.links

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
			logger.debug(options.ctx, 'Upserting card', {
				slug: card.slug
			})
		} else {
			logger.debug(options.ctx, 'Inserting card', {
				slug: card.slug
			})
		}

		const result = options.override
			? await this.backend.upsertElement(options.ctx, card)
			: await this.backend.insertElement(options.ctx, card)

		return result
	}

	/**
   * @summary Query the kernel
   * @function
   * @public
   *
	 * @param {String} session - session id
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {Number} [options.limit] - query limit
	 * @param {Number} [options.skip] - skip
	 * @param {String | String[]} [options.sortBy] - Key or key path as an array to
	 *   a value that the query should be sorted by
	 * @param {'asc' | 'desc'} [options.sortDir] - Set sort direction,
	 * @param {Object} [options.ctx] - execution context
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
	async query (session, schema, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(this.backend, session, schema, {
			writeMode: options.writeMode,
			ctx: options.ctx
		})

		return this.backend.query(options.ctx, filteredQuery, {
			limit: options.limit,
			skip: options.skip,
			sortBy: options.sortBy,
			sortDir: options.sortDir,

			// Do any nested queries with the same permissions
			subquery: async (context, ids, subqueryOptions) => {
				logger.debug(options.ctx, 'Executing subquery', {
					ids
				})

				subqueryOptions.ctx = context
				subqueryOptions.writeMode = options.writeMode
				return this.getCardsById(session, ids, subqueryOptions)
			}
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
	 * @param {String} session - session id
   * @param {Object} schema - JSON Schema
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.writeMode] - write mode
	 * @param {Object} [options.ctx] - execution context
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
	async stream (session, schema, options = {}) {
		const filteredQuery = await permissionFilter.getQuery(this.backend, session, schema, {
			writeMode: options.writeMode,
			ctx: options.ctx
		})

		logger.debug(options.ctx, 'Opening stream')
		return this.backend.stream(options.ctx, filteredQuery)
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
	/* eslint-disable-next-line class-methods-use-this */
	defaults (card) {
		// Object.assign is used as it is significantly faster than using lodash
		const defaultCard = Object.assign({
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
}
