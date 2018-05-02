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

const _ = require('lodash')
const debug = require('debug')('jellyfish:kernel')
const Bluebird = require('bluebird')
const EventEmitter = require('events').EventEmitter
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')
const permissionFilter = require('./permission-filter')
const formulas = require('./formulas')

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
   * const backend = new Backend({
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
		for (const bucket of _.values(this.buckets)) {
			debug(`Creating bucket ${bucket}`)
			await this.backend.createTable(bucket)
		}

		// Built-in cards

		debug('Upserting minimal required cards')
		const unsafeUpsert = (card) => {
			return permissionFilter.unsafeUpsertCard(this.backend, this.getBucketForType(card.type), card)
		}

		await unsafeUpsert(CARDS.type)
		await unsafeUpsert(CARDS.session)
		await unsafeUpsert(CARDS.user)
		const adminUserId = await unsafeUpsert(CARDS['user-admin'])

		this.sessions = {
			admin: await permissionFilter.createSession(this.backend,
				this.getBucketForType('session'), adminUserId, 'admin-kernel')
		}

		return Bluebird.all([
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
	async getCardById (session, id, options) {
		debug(`Fetching card by id ${id}`)
		return _.first(await this.query(session, {
			type: 'object',
			properties: {
				id: {
					type: 'string',
					const: id
				}
			},
			additionalProperties: true,
			required: [ 'id' ]
		}, options)) || null
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
	async getCardBySlug (session, slug, options) {
		debug(`Fetching card by slug ${slug}`)
		return _.first(await this.query(session, {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: slug
				}
			},
			required: [ 'slug' ],
			additionalProperties: true
		}, options)) || null
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
   * @returns {String} the card id
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const id = await kernel.insertCard('4a962ad9-20b5-4dd8-a707-bf819593cc84', { ... })
   * console.log(id)
   */
	async insertCard (session, card, options = {}) {
		jsonSchema.validate(CARDS.card.data.schema, card)

		const schema = _.get(await this.getCardBySlug(session, card.type, {
			writeMode: true
		}), [ 'data', 'schema' ], null)

		if (!schema) {
			throw new this.errors.JellyfishUnknownCardType(`Unknown type: ${card.type}`)
		}

		jsonSchema.validate(schema, card)

		const bucket = this.getBucketForType(card.type)

		if (options.override) {
			return this.backend.upsertElement(bucket, card)
		}

		return this.backend.insertElement(bucket, card)
	}

	/**
   * @summary Evaluate schema formulas against an object
   * @function
   * @public
   *
	 * @param {Object} schema - schema
   * @param {Object} object - input object
   * @returns {Object} evaluated object
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
	 * const result = kernel.evaluateFormulas({
	 *   type: 'object',
	 *   properties: {
	 *     foo: {
	 *       type: 'number',
	 *       $formula: 'MAX(this, 2)'
	 *     }
	 *   }
	 * }, {
	 *   foo: 1
	 * })
	 *
	 * console.log(result.foo)
	 * > 2
   */
	// eslint-disable-next-line class-methods-use-this
	evaluateFormulas (schema, object) {
		for (const path of jsonSchema.getFormulasPaths(schema)) {
			const context = _.get(object, path.output)
			const result = formulas.evaluate(path.formula, context)
			if (!_.isNull(result)) {
				// Mutates input object
				_.set(object, path.output, result)
			}
		}

		return object
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

		if (type === CARDS['action-request'].slug) {
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
		const type = _.get(schema, [ 'properties', 'type', 'const' ])

		if (!type) {
			return _.values(this.buckets)
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
		const filteredQuery = await getFilteredQuery(this, session, schema, options)

		const queries = []
		for (const bucket of this.getBucketsForSchema(schema)) {
			queries.push(await this.backend.query(bucket, filteredQuery))
		}

		return Reflect.apply(_.concat, this, queries)
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
		const emitter = new EventEmitter()
		const streams = {}

		for (const bucket of this.getBucketsForSchema(schema)) {
			streams[bucket] = await this.backend.stream(bucket, filteredQuery)
			streams[bucket].on('closed', () => {
				Reflect.deleteProperty(streams, bucket)
				if (_.isEmpty(streams)) {
					emitter.emit('closed')
				}
			})

			for (const event of [ 'error', 'data' ]) {
				streams[bucket].on(event, (data) => {
					emitter.emit(event, data)
				})
			}
		}

		emitter.close = () => {
			_.each(streams, (stream) => {
				stream.close()
			})
		}

		return emitter
	}

	/**
	 * @summary Check if an object matches a schema
	 * @function
	 * @public
	 *
	 * @param {Object} schema - schema
	 * @param {Object} object - object
	 * @returns {Boolean} whether the object matches the schema
	 *
	 * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * const matches = kernel.matchesSchema({
	 *	 type: 'object'
	 * }, {
	 *	 foo: 'bar'
	 * })
	 *
	 * if (matches) {
	 *	 console.log('The object is valid')
	 * }
	 */
	// eslint-disable-next-line class-methods-use-this
	matchesSchema (schema, object) {
		return jsonSchema.isValid(schema, object)
	}
}
