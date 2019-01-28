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
const EventEmitter = require('events').EventEmitter
const logger = require('../logger').getLogger(__filename)
const jellyscript = require('../jellyscript')
const events = require('./events')
const errors = require('./errors')
const CARDS = require('./cards')

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by'
}

const SCHEMA_NON_EXECUTED_REQUESTS = {
	type: 'object',
	additionalProperties: true,
	required: [ 'type' ],
	$$links: {
		// Unexecuted action request
		[LINK_EXECUTE.INVERSE_NAME]: null
	},
	properties: {
		type: {
			type: 'string',
			const: 'action-request'
		}
	}
}

const pickNextUnexecutedRequest = async (context, jellyfish, session, actor, skip = 0) => {
	const results = await jellyfish.query(
		context, session, SCHEMA_NON_EXECUTED_REQUESTS, {
			skip,
			limit: 1
		})

	const actionRequest = results[0]

	// All action requests were processed
	if (!actionRequest) {
		return null
	}

	if (await jellyfish.lock(actor, actionRequest.slug)) {
		// One last check, as the card links might have been
		// materialized after we started the above query
		const request = await jellyfish.getCardBySlug(
			context, session, actionRequest.slug, {
				type: actionRequest.type
			})
		if (request.links[LINK_EXECUTE.INVERSE_NAME] &&
				request.links[LINK_EXECUTE.INVERSE_NAME].length > 0) {
			await jellyfish.unlock(actor, actionRequest.slug)
			return null
		}

		return actionRequest
	}

	return pickNextUnexecutedRequest(
		context, jellyfish, session, actor, skip + 1)
}

module.exports = class Queue extends EventEmitter {
	/**
   * @summary The actions queue
   * @class
   * @public
   *
	 * @param {Object} context - execution context
	 * @param {Object} jellyfish - jellyfish instance
	 * @param {String} session - session id
   */
	constructor (context, jellyfish, session) {
		super()
		this.context = context
		this.jellyfish = jellyfish
		this.session = session
		this.size = 0
		this.errors = errors
	}

	/**
	 * @summary Initialize the queue
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 *
	 * @example
	 * const queue = new Queue({ ... })
	 * await queue.initialize(context)
	 */
	async initialize (context) {
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.insertCard(context, this.session, card, {
				override: true
			})
		})

		this.queueStream = await this.jellyfish.stream(
			context, this.session, {
				type: 'object',
				required: [ 'type', 'links' ],
				properties: {
					type: {
						type: 'string',
						const: 'action-request'
					},
					links: {
						type: 'object',
						additionalProperties: true
					}
				}
			})

		this.queueStream.once('error', (error) => {
			this.emit('error', error)
		})

		// Use a stream to calculate the queue length
		// based on its deltas
		this.queueStream.on('data', (change) => {
			if (change.after.links[LINK_EXECUTE.INVERSE_NAME] &&
					change.after.links[LINK_EXECUTE.INVERSE_NAME].length > 0) {
				this.size -= 1
			} else {
				this.size += 1
			}
		})

		const nonExecutedRequests = await this.jellyfish.query(
			context, this.session, SCHEMA_NON_EXECUTED_REQUESTS)
		this.size = nonExecutedRequests.length
	}

	/**
	 * @summary Destroy the queue
	 * @function
	 * @public
	 *
	 * @example
	 * const queue = new Queue({ ... })
	 * await queue.initialize(context)
	 * await queue.destroy()
	 */
	async destroy () {
		this.queueStream.removeAllListeners()
		await this.queueStream.close()
	}

	/**
	 * @summary Wait for an action request results
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {Object} actionRequest - action request
	 * @returns {Object} results
	 */
	async waitResults (context, actionRequest) {
		const request = await events.wait(
			context, this.jellyfish, this.session, {
				id: actionRequest.id,
				actor: actionRequest.data.actor
			})
		if (!request) {
			throw new errors.QueueNoRequest(
				`Request not found: ${JSON.stringify(request, null, 2)}`)
		}

		return {
			error: request.data.payload.error,
			timestamp: request.data.payload.timestamp,
			data: request.data.payload.data
		}
	}

	/**
	 * @summary Post execution results
	 * @function
	 * @public
	 *
	 * @param {String} actor - actor
	 * @param {Object} context - execution context
	 * @param {Object} actionRequest - action request
	 * @param {Object} results - action results
	 * @param {Boolean} results.error - whether the result is an error
	 * @param {Any} results.data - action result
	 * @returns {Object} event card
	 */
	async postResults (actor, context, actionRequest, results) {
		const eventCard = await events.post(context, this.jellyfish, this.session, {
			action: actionRequest.data.action,
			actor: actionRequest.data.actor,
			id: actionRequest.id,
			card: actionRequest.data.input.id,
			timestamp: actionRequest.data.timestamp,
			originator: actionRequest.data.originator
		}, results)

		await this.jellyfish.insertCard(context, this.session, {
			slug: `link-${eventCard.slug}`,
			type: 'link',
			name: LINK_EXECUTE.NAME,
			data: {
				inverseName: LINK_EXECUTE.INVERSE_NAME,
				from: {
					id: eventCard.id,
					type: eventCard.type
				},
				to: {
					id: actionRequest.id,
					type: actionRequest.type
				}
			}
		})

		await this.jellyfish.unlock(actor, actionRequest.slug)
		return eventCard
	}

	/**
	 * @summary Get the last execution event given an originator
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} originator - originator card id
	 * @returns {(Object|Null)} last execution event
	 */
	async getLastExecutionEvent (context, originator) {
		return events.getLastExecutionEvent(
			context, this.jellyfish, this.session, originator)
	}

	/**
	 * @summary Get the length of the queue
	 * @function
	 * @public
	 *
	 * @returns {Number} length
	 */
	async length () {
		return this.size
	}

	/**
	 * @summary Dequeue a request
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} actor - actor
	 * @returns {(Object|Null)} request
	 */
	async dequeue (context, actor) {
		const actionRequest = await pickNextUnexecutedRequest(
			context, this.jellyfish, this.session, actor)
		if (!actionRequest) {
			return null
		}

		logger.info(actionRequest.data.context, 'Dequeueing request', {
			actor,
			length: await this.length(),
			request: {
				id: actionRequest.id,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action
			}
		})

		return actionRequest
	}

	/**
	 * @summary Enqueue a request
	 * @function
	 * @public
	 *
	 * @param {String} actor - actor
	 * @param {String} session - session
	 * @param {Object} options - options
	 * @param {String} options.action - action slug
	 * @param {String} options.card - action input card id
	 * @param {String} options.type - action input card type
	 * @param {Object} options.arguments - action arguments
	 * @param {Date} [options.currentDate] - current date
	 * @param {String} [options.originator] - card id that originated this action
	 * @param {Object} [options.context] - execution context
	 * @returns {Object} action request
	 */
	async enqueue (actor, session, options) {
		logger.info(options.context, 'Enqueueing request', {
			actor,
			length: await this.length(),
			request: {
				action: options.action,
				card: options.card,
				type: options.type
			}
		})

		if (!options.type) {
			throw new errors.QueueInvalidRequest('Missing input card type')
		}

		const cards = await Bluebird.props({
			target: this.jellyfish.getCardBySlug(
				options.context, this.session, options.card, {
					type: options.type
				}),
			action: this.jellyfish.getCardBySlug(
				options.context, this.session, options.action, {
					type: 'action'
				}),
			session: this.jellyfish.getCardById(
				options.context, session, session, {
					type: 'session'
				})
		})

		if (!cards.session) {
			throw new errors.QueueInvalidSession(
				`No such session: ${session}`, options.context)
		}

		if (!cards.action) {
			throw new errors.QueueInvalidAction(
				`No such action: ${options.action}`, options.context)
		}

		const targetId = cards.target ? cards.target.id : options.card
		const date = options.currentDate || new Date()
		return this.jellyfish.insertCard(options.context, session, {
			type: 'action-request',
			slug: `action-request-${uuid()}`,
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: options.context,
				originator: options.originator,
				actor: cards.session.data.actor,
				action: cards.action.slug,
				input: {
					id: targetId,
					type: options.type
				},
				arguments: jellyscript.evaluateObject({
					type: 'object',
					properties: cards.action.data.arguments,
					additionalProperties: false,
					required: cards.action.data.required ||
						Object.keys(cards.action.data.arguments)
				}, options.arguments)
			}
		})
	}

	/**
   * @summary Report status of the queue
   * @function
   * @public
   *
   * @returns {Object} status
   */
	async getStatus () {
		return {
			length: await this.length()
		}
	}
}
