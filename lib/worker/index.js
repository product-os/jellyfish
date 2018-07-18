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
const _ = require('lodash')
const uuid = require('uuid/v4')
const events = require('./events')
const errors = require('./errors')
const executor = require('./executor')
const utils = require('./utils')
const MemoryQueue = require('./memory-queue')
const jellyscript = require('../jellyscript')

module.exports = class Worker {
	/**
   * @summary The Jellyfish Actions Worker
   * @class
   * @public
   *
	 * @param {Object} jellyfish - jellyfish instance
	 * @param {String} session - worker privileged session id
	 * @param {Object} actionLibrary - action library
   *
   * @example
	 * const worker = new Worker({ ... }, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
	 *   'action-create-card': { ... },
	 *   'action-update-card': { ... }
	 * })
   */
	constructor (jellyfish, session, actionLibrary) {
		this.jellyfish = jellyfish
		this.queue = new MemoryQueue()
		this.triggers = []
		this.errors = errors
		this.library = actionLibrary

		this.context = {
			errors,
			getCardById: this.jellyfish.getCardById.bind(this.jellyfish),
			getCardBySlug: this.jellyfish.getCardBySlug.bind(this.jellyfish),
			privilegedSession: session,
			insertCard: this.insertCard.bind(this)
		}
	}

	/**
	 * @summary Insert a card
	 * @function
	 * @public
	 *
	 * @param {String} insertSession - The Jellyfish session to insert the card with
	 * @param {Object} typeCard - The type card for the card that will be inserted
	 * @param {Object} options - options
	 * @param {Boolean} options.override - Perform an upsert
	 * @param {Object} card - The card that should be inserted
	 *
	 * @returns {Promise}
	 * @fulfil {Object} inserted card
	 *
	 * @example
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const typeCard = await jellyfish.getCardBySlug(session, 'card')
	 *
	 * const result = await worker.insertCard(session, typeCard, {
	 *   override: false,
	 * }, {
	 *   slug: 'foo',
	 *   data: {
	 *     bar: 'baz'
	 *   }
	 * })
	 *
	 * console.log(result.id)
	 */
	insertCard (insertSession, typeCard, options, card) {
		return executor.insertCard(this.jellyfish, insertSession, typeCard, {
			override: options.override,
			triggers: this.getTriggers(),
			attachEvents: options.attachEvents,
			setTriggers: this.setTriggers.bind(this),
			executeAction: async (executeSession, actionRequest) => {
				return this.enqueue(executeSession, actionRequest)
			}
		}, card)
	}

	/**
	 * @summary Set all registered triggers
	 * @function
	 * @public
	 *
	 * @param {Object[]} triggers - triggers
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * worker.setTriggers([ ... ])
	 */
	setTriggers (triggers) {
		this.triggers = triggers.map((trigger) => {
			if (!trigger.action || !_.isString(trigger.action)) {
				throw new errors.WorkerInvalidTrigger(`Invalid action: ${trigger.action}`)
			}

			if (!trigger.card || (!_.isString(trigger.card) && !_.isPlainObject(trigger.card))) {
				throw new errors.WorkerInvalidTrigger(`Invalid card: ${trigger.card}`)
			}

			if (!trigger.filter || !_.isPlainObject(trigger.filter)) {
				throw new errors.WorkerInvalidTrigger(`Invalid filter: ${trigger.filter}`)
			}

			if (!trigger.arguments || !_.isPlainObject(trigger.arguments)) {
				throw new errors.WorkerInvalidTrigger(`Invalid arguments: ${trigger.arguments}`)
			}

			return {
				action: trigger.action,
				card: trigger.card,
				filter: trigger.filter,
				arguments: trigger.arguments
			}
		})
	}

	/**
	 * @summary Get all registered triggers
	 * @function
	 * @public
	 *
	 * @returns {Object[]} triggers
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const triggers = worker.getTriggers()
	 * console.log(triggers.length)
	 */
	getTriggers () {
		return this.triggers
	}

	/**
	 * @summary Get the length of the actions queue
	 * @function
	 * @public
	 *
	 * @returns {Number} length
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const length = await worker.length()
	 * console.log(length)
	 */
	async length () {
		return this.queue.length()
	}

	/**
	 * @summary Get next action request from the queue
	 * @function
	 * @public
	 *
	 * @returns {(Object|Null)} action request
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const request = await worker.dequeue()
	 * if (request) {
	 *   console.log(request.id)
	 * }
	 */
	async dequeue () {
		return this.queue.dequeue()
	}

	/**
	 * @summary Enqueue an action request
	 * @function
	 * @public
	 *
	 * @param {String} session - session id
	 * @param {Object} options - options
	 * @param {String} options.action - action slug
	 * @param {String} options.card - action input card id
	 * @param {Object} options.arguments - action arguments
	 * @returns {String} action request id
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const id = await worker.enqueue('4a962ad9-20b5-4dd8-a707-bf819593cc84', {
	 *   action: 'action-create-card',
	 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
	 *   arguments: {
	 *     properties: {
	 *       data: {
	 *         foo: 'bar'
	 *       }
	 *     }
	 *   }
	 * })
	 */
	async enqueue (session, options) {
		const cards = await Bluebird.props({
			action: this.jellyfish.getCardBySlug(session, options.action, {
				type: 'action'
			}),
			session: this.jellyfish.getCardById(session, session, {
				type: 'session'
			})
		})

		if (!cards.action) {
			throw new errors.WorkerInvalidAction(`No such action: ${options.action}`)
		}

		const request = {
			id: uuid(),
			card: options.card,
			actor: cards.session.data.actor,
			action: cards.action,
			timestamp: utils.getCurrentTimestamp(),
			arguments: jellyscript.evaluateObject(
				utils.getActionArgumentsSchema(cards.action),
				options.arguments
			).object
		}

		await this.queue.enqueue(request)
		return request.id
	}

	/**
	 * @summary Execute an action request
	 * @function
	 * @public
	 *
	 * @description
	 * You still need to make sure to post the execution event
	 * upon completion.
	 *
	 * @param {String} session - session id
	 * @param {Object} request - request
	 * @param {String} request.actor - actor id
	 * @param {Object} request.action - action card
	 * @param {String} request.timestamp - action timestamp
	 * @param {String} request.card - action input card id
	 * @param {Object} request.arguments - action arguments
	 * @returns {Object} action result
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const result = await worker.execute(jellyfish, session, { ... })
	 * console.log(result.error)
	 * console.log(result.data)
	 */
	async execute (session, request) {
		const result = await executor.run(this.jellyfish, session,
			this.context,
			this.library,
			request
		).then((data) => {
			return {
				error: false,
				data
			}
		}).catch((error) => {
			return {
				error: true,
				data: {
					message: error.message,
					type: error.name
				}
			}
		})

		await events.post(this.jellyfish, session, {
			id: request.id,
			action: request.action.id,
			card: request.card,
			actor: request.actor,
			timestamp: request.timestamp
		}, result)

		return result
	}

	/**
	 * @summary Wait for an action request results
	 * @function
	 * @public
	 *
	 * @param {String} session - session id
	 * @param {String} id - request id
	 * @returns {Object} results
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const requestId = 'a13474e4-7b44-453b-9f3e-aa783b8f37ea'
	 * const results = await worker.waitResults(jellyfish, session, requestId)
	 * console.log(results.data)
	 */
	async waitResults (session, id) {
		const request = await events.wait(this.jellyfish, session, id)
		if (!request) {
			throw new Error(`Request not found: ${id}`)
		}

		return {
			error: request.data.payload.error,
			timestamp: request.data.payload.timestamp,
			data: request.data.payload.data
		}
	}
}
