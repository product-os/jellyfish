/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')

/**
 * @summary The execution event card type slug
 * @type {String}
 * @private
 */
const EXECUTION_EVENT_TYPE = 'execute'

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
		type: EXECUTION_EVENT_TYPE,
		slug: exports.getExecuteEventSlug({
			id: options.id
		}),
		version: '1.0.0',
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

	return jellyfish.insertCard(context, session, contents)
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
	// The .query() function automatically sorts by data.timestamp, so
	// we don't have to manually specify any sorting in this case.
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
				const: EXECUTION_EVENT_TYPE
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
		limit: 1
	})

	return events[0] || null
}

/**
 * @summary Wait for an execution request event
 * @function
 * @public
 *
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
 * const card = await events.wait({ ... }, jellyfish, session, {
 *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422'
 * })
 *
 * console.log(card.id)
 */
exports.wait = async (context, jellyfish, session, options) => {
	const slug = `${EXECUTION_EVENT_TYPE}-${options.id}`
	const schema = {
		type: 'object',
		additionalProperties: true,
		required: [ 'slug', 'active', 'type', 'data' ],
		properties: {
			slug: {
				type: 'string',
				const: slug
			},
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: EXECUTION_EVENT_TYPE
			},
			data: {
				type: 'object',
				additionalProperties: true
			}
		}
	}

	const stream = await jellyfish.stream(context, session, schema)
	const request = await jellyfish.getCardBySlug(context, session, slug, {
		type: EXECUTION_EVENT_TYPE
	})

	if (request && request.active) {
		stream.close()
		return request
	}

	let result = null
	let resolved = false

	stream.once('data', (change) => {
		result = change.after
		stream.close()
	})

	return new Bluebird((resolve, reject) => {
		stream.once('error', (error) => {
			stream.removeAllListeners()
			reject(error)
		})

		stream.once('closed', () => {
			stream.removeAllListeners()
			if (!resolved) {
				resolve(result)
			}
		})

		// One final try now that the stream is finally setup
		jellyfish.getCardBySlug(context, session, slug, {
			type: EXECUTION_EVENT_TYPE
		}).then((results) => {
			if (results && results.active) {
				resolve(results)
				resolved = true
				stream.close()
			}
		}).catch(reject)
	})
}
