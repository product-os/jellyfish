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
const objectTemplate = require('object-template')
const EventEmitter = require('events').EventEmitter
const jsonSchema = require('./json-schema')
const errors = require('./errors')
const CARDS = require('./cards')

const getFilteredQuery = async (kernel, session, schema, options = {}) => {
	const modes = options.writeMode ? [ 'read', 'write' ] : [ 'read' ]
	const user = await kernel.getSessionUser(session)
	const roles = _.chain([ user.slug ])
		.concat(user.data.roles)
		.reduce((accumulator, role) => {
			Reflect.apply(accumulator.push, accumulator, _.map(modes, (mode) => {
				return `view-${mode}-${role}`
			}))

			return accumulator
		}, [])
		.value()

	const filters = await kernel.getViewFilters(roles)
	filters.push(schema)

	return jsonSchema.merge(_.map(filters, (filter) => {
		return objectTemplate.compile(filter, {
			user
		}, {
			delimiters: [ '\\[', '\\]' ]
		})
	}))
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
		await this.unsafeUpsertCard(CARDS.type)
		await this.unsafeUpsertCard(CARDS.session)
		await this.unsafeUpsertCard(CARDS.user)
		const adminUserId = await this.unsafeUpsertCard(CARDS['user-admin'])

		this.sessions = {
			admin: await this.unsafeUpsertCard({
				slug: 'session-admin-kernel',
				type: 'session',
				links: [],
				tags: [],
				active: true,
				data: {
					actor: adminUserId
				}
			})
		}

		for (const card of [
			CARDS.card,
			CARDS.action,
			CARDS['action-request'],
			CARDS.view,
			CARDS['action-update-card'],
			CARDS['action-create-card']
		]) {
			debug(`Upserting core card ${card.slug}`)
			await this.insertCard(this.sessions.admin, card, {
				override: true
			})
		}
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

				// TODO: We should also check that the type equals "type".
				// That would be inefficient with the current JSON Schema
				// querying system, so lets avoid it for now.
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
	 * @summary Get the schema of a card
	 * @function
	 * @public
	 *
   * @param {String} session - session id
	 * @param {Object} card - card
	 * @returns {(Object|Null} schema
	 *
	 * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
	 *
	 * const card = await kernel.getCardBySlug('4a962ad9-20b5-4dd8-a707-bf819593cc84', 'type')
	 * const schema = kernel.getSchema(card)
	 * console.log(schema)
	 */
	// eslint-disable-next-line class-methods-use-this
	getSchema (card) {
		if (!card) {
			return null
		}

		if (card.type === 'type') {
			return _.get(card, [ 'data', 'schema' ], null)
		}

		if (card.type === 'view') {
			const conjunctions = _.map(_.get(card, [ 'data', 'allOf' ]), 'schema')
			const disjunctions = _.map(_.get(card, [ 'data', 'anyOf' ]), 'schema')

			if (_.isEmpty(conjunctions) && _.isEmpty(disjunctions)) {
				return null
			}

			if (!_.isEmpty(disjunctions)) {
				conjunctions.push({
					anyOf: disjunctions
				})
			}

			return jsonSchema.merge(conjunctions)
		}

		return null
	}

	/**
   * @summary Upsert a card to the kernel in an unsafe way
   * @function
   * @private
	 *
	 * @description
	 * This function should only be used to boostrap the system.
   *
   * @param {Object} card - card object
   * @returns {String} the card id
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const id = await kernel.unsafeUpsertCard({ ... })
   * console.log(id)
   */
	async unsafeUpsertCard (card) {
		jsonSchema.validate(CARDS.card.data.schema, card)
		jsonSchema.validate(CARDS[card.type].data.schema, card)
		return this.backend.upsertElement(this.getBucketForType(card.type), card)
	}

	/**
	 * @summary Get the user that corresponds to a session
	 * @function
	 * @public
	 *
	 * @param {String} session - session id
	 * @returns {Object} user card
	 *
	 * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const user = await kernel.getSessionUser('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   * console.log(user.data.email)
	 */
	async getSessionUser (session) {
		// Notice we can't use .query() here since that function depends on this one
		const sessionCard = await this.backend.getElementById(this.getBucketForType('session'), session)
		if (!sessionCard) {
			throw new this.errors.JellyfishNoElement(`Invalid session: ${session}`)
		}

		if (sessionCard.data.expiration && new Date() > new Date(sessionCard.data.expiration)) {
			throw new this.errors.JellyfishSessionExpired(`Session expired at: ${sessionCard.data.expiration}`)
		}

		const actor = await this.backend.getElementById(this.getBucketForType('user'), sessionCard.data.actor)
		if (!actor) {
			throw new this.errors.JellyfishNoElement(`Invalid actor: ${sessionCard.data.actor}`)
		}

		return actor
	}

	/**
	 * @summary Get the schema filters that apply to a set of views
	 * @function
	 * @private
	 *
	 * @param {String[]} roles - roles
	 * @returns {Object[]} filters
	 *
	 * @example
	 * const kernel = new Kernel(backend, { ... })
	 * await kernel.initialize()
	 *
	 * const filters = await kernel.getViewFilters([ 'view-resineer', 'view-user-guest' ])
	 *
	 * for (const filter of filters) {
	 *   console.log(filter)
	 * }
	 */
	async getViewFilters (roles) {
		const CARD_TYPE = 'view'
		return Bluebird.reduce(roles, (accumulator, role) => {
			return this.backend.getElementBySlug(this.getBucketForType(CARD_TYPE), role)
				.then((card) => {
					if (card && card.type !== CARD_TYPE) {
						return null
					}

					return this.getSchema(card)
				})
				.then((schema) => {
					if (schema) {
						accumulator.push(schema)
					}

					return accumulator
				})
		}, [])
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
		_.defaults(options, {
			override: false
		})

		_.defaults(card, {
			active: true,
			tags: [],
			links: [],
			data: {}
		})

		jsonSchema.validate(this.getSchema(CARDS.card), card)

		const schema = this.getSchema(await this.getCardBySlug(session, card.type, {
			writeMode: true
		}))

		if (!schema) {
			throw new this.errors.JellyfishUnknownCardType(`Unknown type: ${card.type}`)
		}

		jsonSchema.validate(schema, card)

		const bucket = this.getBucketForType(card.type)
		const data = _.omit(card, [ 'transient' ])

		if (options.override) {
			return this.backend.upsertElement(bucket, data)
		}

		return this.backend.insertElement(bucket, data)
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
