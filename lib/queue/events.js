/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const EventEmitter = require('events').EventEmitter
const redis = require('redis')
Bluebird.promisifyAll(redis.RedisClient.prototype)
const ExpireMap = require('map-cache-ttl')

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
const EXECUTE_EVENT_NAME = 'slug-inserted'

/**
 * @summary Get the slug of an execute event card
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @returns {String} slug
 */
const getExecuteEventSlug = (options) => {
	return `${EXECUTION_EVENT_TYPE}-${options.id}`
}

/**
 * @summary Create request execution event
 * @function
 * @public
 *
 * @param {Object} context - execution context
 * @param {Object} redisClient - redis client
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
exports.post = async (context, redisClient, jellyfish, session, options, results) => {
	const contents = {
		type: `${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`,
		slug: getExecuteEventSlug({
			id: options.id
		}),
		version: EXECUTION_EVENT_VERSION,
		active: true,
		links: {},
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			timestamp: new Date().toISOString(),
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
	}

	if (options.originator) {
		contents.data.originator = options.originator
	}

	const executeEvent = await jellyfish.insertCard(context, session, contents)
	await exports.notifyExecuteEvent(redisClient, executeEvent)
	return executeEvent
}

exports.notifyExecuteEvent = async (redisClient, card) => {
	return redisClient.publish(EXECUTE_EVENT_NAME, JSON.stringify(card))
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
	constructor (redisOptions) {
		this.expireMap = new ExpireMap('30s', '1m')
		this.eventEmitter = new EventEmitter()
		this.redisOptions = redisOptions
		this.redis = null
	}

	async init () {
		this.redis = await redis.createClient(this.redisOptions)
		this.redis.on('message', (channel, message) => {
			this.add(JSON.parse(message))
		})
		this.redis.subscribe(EXECUTE_EVENT_NAME)
	}

	add (card) {
		this.expireMap.set(card.slug, card)
		this.eventEmitter.emit(card.slug, card)
	}

	once (slug, callback) {
		const card = this.expireMap.get(slug)
		if (card) {
			callback(card)
			return
		}
		this.eventEmitter.once(slug, callback)
	}

	async stop () {
		if (!this.redis) {
			return
		}

		await this.redis.quit()
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

	return new Promise((resolve) => {
		executeEventsListener.once(slug, resolve)
	})
}
