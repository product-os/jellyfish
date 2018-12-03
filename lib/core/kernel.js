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

const logger = require('../logger').getLogger('jellyfish:kernel')
const _ = require('lodash')
const assert = require('./assert')
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const permissionFilter = require('./permission-filter')
const {
	deepEqual
} = require('fast-equals')
const isObj = require('isobj')

const isUUID = (string) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(string)
}

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
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   * await kernel.disconnect()
   */
	async disconnect () {
		await this.backend.disconnect()
	}

	/**
   * @summary Initialize the kernel
   * @function
   * @public
	 *
	 * @param {Object} ctx - execution context
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
	async initialize (ctx) {
		await this.backend.connect(ctx)

		// Built-in cards

		logger.debug(ctx, 'Upserting minimal required cards')
		const unsafeUpsert = (card) => {
			return permissionFilter.unsafeUpsertCard(this.backend, card, ctx)
		}

		await Promise.all([
			unsafeUpsert(CARDS.type),
			unsafeUpsert(CARDS.session),
			unsafeUpsert(CARDS.user),
			unsafeUpsert(CARDS['view-read-user-admin'])
		])

		const adminUser = await unsafeUpsert(CARDS['user-admin'])
		const adminSession = await permissionFilter.createSession(this.backend, adminUser.id, 'admin-kernel', ctx)

		this.sessions = {
			admin: adminSession.id
		}

		return Promise.all([
			CARDS.card,
			CARDS.action,
			CARDS['action-request'],
			CARDS.event,
			CARDS.view,
			CARDS.link
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
		logger.debug(options.ctx, `Fetching card by id ${id}`)

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
		logger.debug(options.ctx, `Fetching card by slug ${slug}`)

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
		jsonSchema.validate(CARDS.card.data.schema, card)

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
					? await this.backend.getElementById(card.id, {
						ctx: options.ctx,
						type: card.type
					})
					: await this.backend.getElementBySlug(card.slug, {
						ctx: options.ctx,
						type: card.type
					})

				if (element) {
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
		}

		const result = options.override
			? await this.backend.upsertElement(card, options.ctx)
			: await this.backend.insertElement(card, options.ctx)

		// A transitionary block to create link cards every time
		// we push a card with a foreign key in "data.target".
		// This shouldn't be necessary in the future, once we
		// completely replace these "data" uuids with links.
		if (_.isString(result.data.target)) {
			// The target might be a slug
			const target = isUUID(result.data.target) ? {
				id: result.data.target
			} : await this.getCardBySlug(session, result.data.target, {
				ctx: options.ctx
			})

			await this.insertCard(session, {
				slug: `link-target-${result.id}`,
				type: 'link',
				name: 'is attached to',
				data: {
					inverseName: 'has attached element',
					from: result.id,
					to: target.id
				}
			}, {
				override: true,
				ctx: options.ctx
			})
		}

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

		return this.backend.query(filteredQuery, {
			limit: options.limit,
			skip: options.skip,
			sortBy: options.sortBy,
			sortDir: options.sortDir,

			// Do any nested queries with the same permissions
			subquery: async (subschema) => {
				return this.query(session, subschema, options)
			},
			ctx: options.ctx
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

		return this.backend.stream(filteredQuery, options.ctx)
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
		return Object.assign({
			active: true,
			version: '1.0.0',
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			data: {}
		}, card)
	}
}
