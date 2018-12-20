/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
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
const uuid = require('uuid/v4')
const logger = require('../logger').getLogger(__filename)

/**
 * @summary The execution event card type slug
 * @type {String}
 * @private
 */
const EXECUTION_EVENT_TYPE = 'execute'

/**
 * @summary Create request execution event
 * @function
 * @public
 *
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
 * @param {Object} ctx - execution context
 * @returns {Object} event card
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.post(jellyfish, session, {
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
exports.post = async (jellyfish, session, options, results, ctx) => {
	const date = new Date()
	const data = {
		timestamp: date.toISOString(),
		target: options.action,
		actor: options.actor,
		payload: {
			id: options.id,
			card: options.card,
			timestamp: options.timestamp,
			error: results.error,
			data: results.data
		}
	}

	const contents = {
		type: EXECUTION_EVENT_TYPE,
		slug: `${EXECUTION_EVENT_TYPE}-${data.actor}-${uuid()}`,
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

	return jellyfish.insertCard(ctx, session, contents)
}

/**
 * @summary Get the last execution event given an originator
 * @function
 * @public
 *
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} originator - originator card id
 * @param {Object} ctx - execution context
 * @returns {(Object|Null)} last execution event
 *
 * @example
 * const originator = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 *
 * const executeEvent = await events.getLastExecutionEvent(jellyfish, session, originator)
 * if (executeEvent) {
 *   console.log(executeEvent.data.timestamp)
 * }
 */
exports.getLastExecutionEvent = async (jellyfish, session, originator, ctx) => {
	// The .query() function automatically sorts by data.timestamp, so
	// we don't have to manually specify any sorting in this case.
	const events = await jellyfish.query(ctx, session, {
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
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @param {String} options.actor - actor id
 * @param {String} options.action - action id
 * @param {String} options.card - action input card id
 * @param {Object} options.ctx - execution context
 * @returns {Object} execution request event
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.wait(jellyfish, session, {
 *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
 *   action: '57692206-8da2-46e1-91c9-159b2c6928ef',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
 *   actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
 * })
 *
 * console.log(card.id)
 */
exports.wait = async (jellyfish, session, options) => {
	const schema = {
		type: 'object',
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
				additionalProperties: true,
				required: [ 'target', 'actor', 'payload' ],
				properties: {
					target: {
						type: 'string',
						const: options.action
					},
					actor: {
						type: 'string',
						const: options.actor
					},
					payload: {
						type: 'object',
						additionalProperties: true,
						required: [ 'id', 'card' ],
						properties: {
							id: {
								type: 'string',
								const: options.id
							},
							card: {
								type: 'string',
								const: options.card
							}
						}
					}
				}
			}
		},
		required: [ 'active', 'type', 'data' ]
	}

	const stream = await jellyfish.stream(options.ctx, session, schema)
	const request = await jellyfish.query(options.ctx, session, schema, {
		limit: 1
	})

	if (request.length > 0) {
		stream.close()
		return request[0]
	}

	let timeout = null
	let result = null

	stream.once('data', (change) => {
		result = change.after
		clearTimeout(timeout)
		stream.close()
	})

	return new Bluebird((resolve, reject) => {
		stream.once('error', (error) => {
			stream.removeAllListeners()
			clearTimeout(timeout)
			reject(error)
		})

		stream.once('closed', () => {
			stream.removeAllListeners()
			clearTimeout(timeout)
			resolve(result)
		})

		// A couple of retries now that the stream is finally setup
		jellyfish.query(options.ctx, session, schema, {
			limit: 1
		}).then((firstResults) => {
			if (firstResults.length > 0) {
				stream.close()
				return resolve(firstResults[0])
			}

			timeout = setTimeout(() => {
				logger.warn(options.ctx, 'Last poll retry when waiting for execute event', options)
				jellyfish.query(options.ctx, session, schema, {
					limit: 1
				}).then((secondResults) => {
					if (secondResults.length > 0) {
						stream.close()
						return resolve(secondResults[0])
					}

					throw new Error('Cancelling stream')
				}).catch((error) => {
					stream.close()
					return reject(error)
				})
			}, 8000)

			return timeout
		}).catch((error) => {
			stream.close()
			clearTimeout(timeout)
			return reject(error)
		})
	})
}
