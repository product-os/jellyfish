/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const ExpireArray = require('./expire-array')

/**
 * @summary The execution event card type slug
 * @type {String}
 * @private
 */
const EXECUTION_EVENT_TYPE = 'execute'

/**
 * @summary The execution event card version
 * @type {String}
 * @private
 * @description
 * Events in the system are meant to be immutable, so
 * they would always stay at a fixed version.
 */
const EXECUTION_EVENT_VERSION = '1.0.0'

/**
 * @summary The name of the notification we send when an execution event has been inserted
 * @type {string}
 * @private
 */
const EXECUTE_EVENT_PG_NOTIFICATION = 'slug-inserted'

/**
 * @summary Get the slug of an execute event card
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @returns {String} slug
 */
exports.getExecuteEventSlug = (options) => {
	return `${EXECUTION_EVENT_TYPE}-${options.id}`
}

/**
 * @summary Create request execution event
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @param {String} options.actor - actor id
 * @param {String} options.action - action id
 * @param {String} options.timestamp - action timestamp
 * @param {String} options.card - action input card id
 * @param {String} [options.originator] - action originator card id
 * @param {Object} results - action results
 * @param {Boolean} results.error - whether the result is an error
 * @param {Any} results.data - action result
 * @returns {Object} event card
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.post({ ... }, jellyfish, session, {
 *   id: '414f2345-4f5e-4571-820f-28a49731733d',
 *   action: '57692206-8da2-46e1-91c9-159b2c6928ef',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
 *   actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
 *   originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
 *   timestamp: '2018-06-30T19:34:42.829Z'
 * }, {
 *   error: false,
 *   data: '414f2345-4f5e-4571-820f-28a49731733d'
 * })
 *
 * console.log(card.id)
 */
exports.post = async (context, jellyfish, session, options, results) => {
	const date = new Date()
	const data = {
		timestamp: date.toISOString(),
		target: options.id,
		actor: options.actor,
		payload: {
			action: options.action,
			card: options.card,
			timestamp: options.timestamp,
			error: results.error,
			data: results.data
		}
	}

	const contents = {
		type: `${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`,
		slug: exports.getExecuteEventSlug({
			id: options.id
		}),
		version: EXECUTION_EVENT_VERSION,
		active: true,
		links: {},
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data
	}

	if (options.originator) {
		contents.data.originator = options.originator
	}

	const insertCard = await jellyfish.insertCard(context, session, contents)
	await notifyInsertedSlug(jellyfish, insertCard.slug)
	return insertCard
}

const notifyInsertedSlug = async (jellyfish, slug) => {
	return jellyfish.backend.connection.any({
		name: 'notify-event-slug',
		text: `SELECT pg_notify('${EXECUTE_EVENT_PG_NOTIFICATION}', $1)`,
		values: [ slug ]
	})
}

/**
 * @summary Get the last execution event given an originator
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} originator - originator card id
 * @returns {(Object|Null)} last execution event
 *
 * @example
 * const originator = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 *
 * const executeEvent = await events.getLastExecutionEvent({ ... }, jellyfish, session, originator)
 * if (executeEvent) {
 *   console.log(executeEvent.data.timestamp)
 * }
 */
exports.getLastExecutionEvent = async (context, jellyfish, session, originator) => {
	const events = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'active', 'type', 'data' ],
		additionalProperties: true,
		properties: {
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				enum: [

					// TODO: Remove this OR operator once the whole
					// system relies on versioned references.
					EXECUTION_EVENT_TYPE,

					`${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`
				]
			},
			data: {
				type: 'object',
				required: [ 'originator' ],
				additionalProperties: true,
				properties: {
					originator: {
						type: 'string',
						const: originator
					}
				}
			}
		}
	}, {
		sortBy: 'created_at',
		limit: 1
	})

	return events[0] || null
}

exports.ExecuteEventsListener = class ExecuteEventsListener {
	constructor (connection) {
		this.expireArray = new ExpireArray(30 * 1000)
		this.eventEmitter = new EventEmitter()
		this.connection = connection
		this.liveConnection = null
		this.liveConnectionKeepAliveInterval = null
	}

	async init () {
		this.liveConnection = await this.connection.connect()
		await this.liveConnection.client.query(`LISTEN "${EXECUTE_EVENT_PG_NOTIFICATION}"`)
		this.liveConnection.client.on('notification', (data) => {
			this.add(data.payload)
		})

		this.liveConnectionKeepAliveInterval = setInterval(() => {
			this.liveConnection.query({
				name: 'connection-test',
				text: 'select true'
			})
		}, 10000)
	}

	add (slug) {
		this.expireArray.push(slug)
		this.eventEmitter.emit(slug)
	}

	once (slug, callback) {
		if (_.includes(this.expireArray.elements, slug)) {
			callback()
			return
		}
		this.eventEmitter.once(slug, callback)
	}

	async stop () {
		clearInterval(this.liveConnectionKeepAliveInterval)
		if (this.liveConnection) {
			await this.liveConnection.done()
		}
	}
}

/**
 * @summary Wait for an execution request event
 * @function
 * @public
 *
 * @param {Object} executeEventsListener - an instance of ExecuteEventsListener
 * @param {Object} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @param {String} options.actor - actor id
 * @returns {Object} execution request event
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.wait(executeEventsListener, { ... }, jellyfish, session, {
 *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422'
 * })
 *
 * console.log(card.id)
 */
exports.wait = async (executeEventsListener, context, jellyfish, session, options) => {
	const slug = `${EXECUTION_EVENT_TYPE}-${options.id}`

	return new Promise((resolve, reject) => {
		executeEventsListener.once(slug, () => {
			jellyfish.getCardBySlug(context, session, `${slug}@${EXECUTION_EVENT_VERSION}`)
				.then(resolve)
				.catch(reject)
		})
	})
}
