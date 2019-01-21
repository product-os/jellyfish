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
const jellyscript = require('../jellyscript')
const events = require('./events')
const errors = require('./errors')
const MemoryQueue = require('./memory-queue')
const CARDS = require('./cards')

module.exports = class Queue {
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
		this.context = context
		this.jellyfish = jellyfish
		this.session = session
		this.data = new MemoryQueue()
		this.errors = errors
	}

	/**
	 * @summary Initialize the worker
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * await worker.initialize(context)
	 */
	async initialize (context) {
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.insertCard(context, this.session, card, {
				override: true
			})
		})
	}

	/**
	 * @summary Wait for an action request results
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {Object} options - options
	 * @param {String} options.actor - actor id
	 * @param {String} options.action - action id
	 * @param {String} options.card - action input card id
	 * @returns {Object} results
	 */
	async waitResults (context, options) {
		const request = await events.wait(
			context, this.jellyfish, this.session, options)
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
	 * @param {Object} context - execution context
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
	 */
	async postResults (context, options, results) {
		return events.post(
			context, this.jellyfish, this.session, options, results)
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
		return this.data.length()
	}

	/**
	 * @summary Dequeue a request
	 * @function
	 * @public
	 *
	 * @returns {(Object|Null)} request
	 */
	async dequeue () {
		const request = await this.data.dequeue()

		if (request) {
			logger.info(request.context, 'Dequeueing request', {
				length: await this.length(),
				request: {
					id: request.id,
					card: request.card,
					type: request.type,
					actor: request.actor,
					action: request.action.slug
				}
			})
		}

		return request
	}

	/**
	 * @summary Enqueue a request
	 * @function
	 * @public
	 *
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
	async enqueue (session, options) {
		logger.info(options.context, 'Enqueueing request', {
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
		const request = {
			id: uuid(),
			context: options.context,
			card: targetId,
			type: options.type,
			actor: cards.session.data.actor,
			action: cards.action,
			originator: options.originator,
			timestamp: date.toISOString(),
			epoch: date.valueOf(),
			arguments: jellyscript.evaluateObject({
				type: 'object',
				properties: cards.action.data.arguments,
				additionalProperties: false,
				required: cards.action.data.required ||
					Object.keys(cards.action.data.arguments)
			}, options.arguments)
		}

		await this.data.enqueue(request)
		return {
			id: request.id,
			action: cards.action.id,
			card: targetId,
			type: options.type,
			actor: cards.session.data.actor
		}
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
