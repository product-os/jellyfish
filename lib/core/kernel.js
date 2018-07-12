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

const debug = require('debug')('jellyfish:kernel')
const jsonSchema = require('../json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const permissionFilter = require('./permission-filter')

const getFilteredQuery = async (kernel, session, schema, options = {}) => {
	return permissionFilter.getQuery(kernel.backend, session, schema, {
		writeMode: options.writeMode,
		buckets: {
			session: kernel.getBucketForType('session'),
			user: kernel.getBucketForType('user'),
			view: kernel.getBucketForType('view')
		}
	})
}

module.exports = class Kernel {
	/**
   * @summary The Jellyfish Kernel
   * @class
   * @public
   *
   * @param {Object} backend - the backend instance
   * @param {Object} options - options
   * @param {Object} options.buckets - buckets
   * @param {String} options.buckets.cards - the cards bucket
   * @param {String} options.buckets.requests - the requests bucket
   * @param {String} options.buckets.sessions - the sessions bucket
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
   * const kernel = new Kernel(backend, {
   *   buckets: {
   *     cards: 'cards',
   *     requests: 'requests',
   *     sessions: 'sessions'
   *   }
   * })
   */
	constructor (backend, options) {
		this.backend = backend
		this.buckets = options.buckets
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
	async initialize () {
		await this.backend.connect()

		// Built-in tables
		await Promise.all(Object.values(this.buckets).map((bucket) => {
			debug(`Creating bucket ${bucket}`)
			return this.backend.createTable(bucket)
		}))

		// Built-in cards

		debug('Upserting minimal required cards')
		const unsafeUpsert = (card) => {
			return permissionFilter.unsafeUpsertCard(this.backend, this.getBucketForType(card.type), card)
		}

		await Promise.all([
			unsafeUpsert(CARDS.type),
			unsafeUpsert(CARDS.session),
			unsafeUpsert(CARDS.user)
		])

		const adminUser = await unsafeUpsert(CARDS['user-admin'])
		const adminSession = await permissionFilter.createSession(this.backend,
			this.getBucketForType('session'), adminUser.id, 'admin-kernel')

		this.sessions = {
			admin: adminSession.id
		}

		return Promise.all([
			CARDS.card,
			CARDS.action,
			CARDS['action-request'],
			CARDS.view
		].map((card) => {
			debug(`Upserting core card ${card.slug}`)
			return this.insertCard(this.sessions.admin, card, {
				override: true
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
		debug(`Fetching card by id ${id}`)

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
			limit: options.limit
		})

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
		debug(`Fetching card by slug ${slug}`)

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
			limit: options.limit
		})

		return results[0] || null
	}

	/**
   * @summary Insert a card to the kernel
   * @function
   * @protected
   *
   * @param {String} session - session id
   * @param {Object} card - card object
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
	async insertCard (session, card, options = {}) {
		jsonSchema.validate(CARDS.card.data.schema, card)

		const typeCard = await this.getCardBySlug(session, card.type, {
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
			const filter = await getFilteredQuery(this, session, null, {
				writeMode: true
			})

			jsonSchema.validate(filter, card)
		}

		const bucket = this.getBucketForType(card.type)

		if (options.override) {
			return this.backend.upsertElement(bucket, card)
		}

		return this.backend.insertElement(bucket, card)
	}

	/**
   * @summary Get the right bucket to store a certain card type
   * @function
   * @private
   *
   * @param {String} type - card type
   * @returns {String} bucket
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const bucket = kernel.getBucketForType('foo')
   */
	getBucketForType (type) {
		// We decided to store certain cards in
		// different tables for performance reasons

		if (type === CARDS['action-request'].slug || type === 'execute') {
			return this.buckets.requests
		}

		if (type === CARDS.session.slug) {
			return this.buckets.sessions
		}

		return this.buckets.cards
	}

	/**
   * @summary Get the list of buckets we should use to execute a schema
   * @function
   * @private
   *
   * @description
   * The purpose of this function is to identify performance shorcuts
   * to avoid querying more thn one table if we know what the user
   * is looking for.
   *
   * @param {String} schema - json schema
   * @returns {String[]} buckets
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const buckets = kernel.getBucketsForSchema({
   *   type: 'object',
   *   properties: {
   *     type: {
   *       type: 'string',
   *       const: 'foo'
   *     }
   *   },
   *   required: [ 'type' ]
   * })
   */
	getBucketsForSchema (schema) {
		const type = schema.properties &&
			schema.properties.type &&
			schema.properties.type.const
			? schema.properties.type.const : null

		if (!type) {
			return Object.values(this.buckets)
		}

		return [ this.getBucketForType(type) ]
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
		const filteredQuery = await getFilteredQuery(this, session, schema, {
			writeMode: options.writeMode
		})

		const queries = await Promise.all(this.getBucketsForSchema(filteredQuery).map((bucket) => {
			return this.backend.query(bucket, filteredQuery, {
				limit: options.limit
			})
		}))

		const items = []
		for (const result of queries) {
			items.push(...result)
		}

		return items
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
	async stream (session, schema, options) {
		const filteredQuery = await getFilteredQuery(this, session, schema, options)
		const buckets = this.getBucketsForSchema(filteredQuery)

		if (buckets.length === 1) {
			return this.backend.stream(buckets[0], filteredQuery)
		}

		return this.backend.streamJoin(buckets, filteredQuery)
	}
}
