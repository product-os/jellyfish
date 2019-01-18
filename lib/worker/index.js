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
const errio = require('errio')
const _ = require('lodash')
const uuid = require('uuid/v4')
const errors = require('./errors')
const executor = require('./executor')
const utils = require('./utils')
const triggers = require('./triggers')
const jellyscript = require('../jellyscript')
const logger = require('../logger').getLogger(__filename)

module.exports = class Worker {
	/**
	 * @summary The Jellyfish Actions Worker
	 * @class
	 * @public
	 *
	 * @param {Object} jellyfish - jellyfish instance
	 * @param {String} session - worker privileged session id
	 * @param {Object} actionLibrary - action library
	 * @param {Object} queue - action queue
	 *
	 * @example
	 * const worker = new Worker({ ... }, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
	 *   'action-create-card': { ... },
	 *   'action-update-card': { ... }
	 * })
	 */
	constructor (jellyfish, session, actionLibrary, queue) {
		this.jellyfish = jellyfish
		this.triggers = []
		this.errors = errors
		this.session = session
		this.library = actionLibrary
		this.queue = queue
	}

	/**
	 * @summary Get the action context
	 * @function
	 * @private
	 *
	 * @param {Object} context - execution context
	 * @returns {Object} action context
	 *
	 * @example
	 * const actionContext = worker.getActionContext({ ... })
	 */
	getActionContext (context) {
		return {
			errors,
			getEventSlug: utils.getEventSlug,
			getCardById: _.bind(function (lsession, id, options) {
				return this.jellyfish.getCardById(context, lsession, id, options)
			}, this),
			getCardBySlug: _.bind(function (lsession, slug, options) {
				return this.jellyfish.getCardBySlug(context, lsession, slug, options)
			}, this),
			query: _.bind(function (lsession, schema, options) {
				return this.jellyfish.query(context, lsession, schema, options)
			}, this),
			privilegedSession: this.session,
			insertCard: _.bind(function (lsession, typeCard, options, card) {
				return this.insertCard(context, lsession, typeCard, options, card)
			}, this),
			cards: this.jellyfish.cards
		}
	}

	/**
	 * @summary Insert a card
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} insertSession - The Jellyfish session to insert the card with
	 * @param {Object} typeCard - The type card for the card that will be inserted
	 * @param {Object} options - options
	 * @param {Boolean} options.override - Perform an upsert
	 * @param {Date} [options.timestamp] - Upsert timestamp
	 * @param {Object} card - The card that should be inserted
	 *
	 * @returns {Promise}
	 * @fulfil {Object} inserted card
	 *
	 * @example
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const typeCard = await jellyfish.getCardBySlug(session, 'card')
	 *
	 * const result = await worker.insertCard({ ... }, session, typeCard, {
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
	insertCard (context, insertSession, typeCard, options, card) {
		return executor.insertCard(context, this.jellyfish, insertSession, typeCard, {
			override: options.override,
			triggers: this.getTriggers(),
			timestamp: options.timestamp,
			currentTime: new Date(),
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
	 * @param {Object} context - execution context
	 * @param {Object[]} objects - triggers
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * worker.setTriggers([ ... ])
	 */
	setTriggers (context, objects) {
		logger.info(context, 'Setting triggers', {
			count: objects.length
		})

		this.triggers = objects.map((trigger) => {
			if (!trigger.id || !_.isString(trigger.id)) {
				throw new errors.WorkerInvalidTrigger(`Invalid id: ${trigger.id}`, context)
			}

			if (!trigger.action || !_.isString(trigger.action)) {
				throw new errors.WorkerInvalidTrigger(`Invalid action: ${trigger.action}`, context)
			}

			if (!trigger.card || (!_.isString(trigger.card) && !_.isPlainObject(trigger.card))) {
				throw new errors.WorkerInvalidTrigger(`Invalid card: ${trigger.card}`, context)
			}

			if (!trigger.type || (!_.isString(trigger.type) && !_.isPlainObject(trigger.type))) {
				throw new errors.WorkerInvalidActionRequest(`Invalid type: ${trigger.type}`, context)
			}

			if (trigger.interval && trigger.filter) {
				throw new errors.WorkerInvalidTrigger('Use either a filter or an interval', context)
			}

			if (!trigger.interval && (!trigger.filter || !_.isPlainObject(trigger.filter))) {
				throw new errors.WorkerInvalidTrigger(`Invalid filter: ${trigger.filter}`, context)
			}

			if (!trigger.filter && (!trigger.interval || !_.isString(trigger.interval))) {
				throw new errors.WorkerInvalidTrigger(`Invalid interval: ${trigger.interval}`, context)
			}

			if (!trigger.arguments || !_.isPlainObject(trigger.arguments)) {
				throw new errors.WorkerInvalidTrigger(`Invalid arguments: ${trigger.arguments}`, context)
			}

			const result = {
				id: trigger.id,
				action: trigger.action,
				card: trigger.card,
				type: trigger.type,
				arguments: trigger.arguments
			}

			if (trigger.startDate) {
				result.startDate = trigger.startDate
			}

			if (trigger.filter) {
				result.filter = trigger.filter
			}

			if (trigger.interval) {
				result.interval = trigger.interval
			}

			return result
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
		const request = await this.queue.dequeue()

		if (request) {
			logger.info(request.context, 'Dequeueing request', {
				request: {
					id: request.id,
					card: request.card,
					type: request.type,
					actor: request.actor,
					action: request.action.slug
				},
				length: await this.queue.length()
			})
		}

		return request
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
	 * @param {String} options.type - action input card type
	 * @param {Object} options.arguments - action arguments
	 * @param {Date} [options.currentDate] - current date
	 * @param {String} [options.originator] - card id that originated this action
	 * @param {Object} [options.context] - execution context
	 * @returns {Object} action request
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const request = await worker.enqueue('4a962ad9-20b5-4dd8-a707-bf819593cc84', {
	 *   action: 'action-create-card',
	 *   type: 'card',
	 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
	 *   originator: '2ebb5e46-ef8a-485b-ba04-e8266d8c0677',
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
		logger.info(options.context, 'Enqueueing request', {
			request: {
				action: options.action,
				card: options.card,
				type: options.type
			},
			length: await this.queue.length()
		})

		if (!options.type) {
			throw new errors.WorkerInvalidActionRequest('Missing input card type')
		}

		const cards = await Bluebird.props({
			target: this.jellyfish.getCardBySlug(options.context, session, options.card, {
				type: options.type
			}),
			action: this.jellyfish.getCardBySlug(options.context, session, options.action, {
				type: 'action'
			}),
			session: this.jellyfish.getCardById(options.context, session, session, {
				type: 'session'
			})
		})

		if (!cards.session) {
			throw new errors.WorkerNoElement(`No such session: ${session}`, options.context)
		}

		if (!cards.action) {
			throw new errors.WorkerInvalidAction(`No such action: ${options.action}`, options.context)
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
			arguments: jellyscript.evaluateObject(
				utils.getActionArgumentsSchema(cards.action),
				options.arguments
			)
		}

		await this.queue.enqueue(request)
		return {
			id: request.id,
			action: cards.action.id,
			card: targetId,
			type: options.type,
			actor: cards.session.data.actor
		}
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
	 * @param {String} [request.originator] - action originator card id]
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
		logger.info(request.context, 'Executing request', {
			request: {
				id: request.id,
				card: request.card,
				type: request.type,
				actor: request.actor,
				action: request.action.slug
			},
			length: await this.queue.length()
		})

		const result = await executor.run(this.jellyfish, session,
			this.getActionContext(request.context),
			this.library,
			request
		).then((data) => {
			logger.info(request.context, 'Execute success', {
				data
			})

			return {
				error: false,
				data
			}
		}).catch((error) => {
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.error(request.context, 'Execute error', {
				error: errorObject
			})

			return {
				error: true,
				data: errorObject
			}
		})

		const event = await this.queue.postResults(request.context, {
			id: request.id,
			action: request.action.id,
			originator: request.originator,
			card: request.card,
			actor: request.actor,
			timestamp: request.timestamp
		}, result)

		if (!event) {
			throw new errors.WorkerNoExecuteEvent(
				`Could not create execute event for request: ${request.id}`)
		}

		logger.info(request.context, 'Execute event posted', {
			slug: event.slug,
			type: event.type,
			target: event.data.target,
			actor: event.data.actor,
			payload: {
				id: event.data.payload.id,
				card: event.data.payload.card,
				error: event.data.payload.error
			}
		})

		return result
	}

	/**
	 * @summary Execute a worker tick
	 * @function
	 * @public
	 *
	 * @description
	 * A tick is necessary to dispatch time-triggered actions and potentially
	 * any other logic that depends on the concept of time.
	 *
	 * Applications should "tick" on a certain interval. Shorter intervals
	 * increase the accuracy of time-related actions, but introduces more
	 * overhead.
	 *
	 * The tick operation may enqueue new actions but will not execute them
	 * right away.
	 *
	 * @param {Object} context - execution context
	 * @param {String} session - session id
	 * @param {Object} options - options
	 * @param {Date} options.currentDate - current date
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 *
	 * await worker.tick({ ... }, session, {
	 *   currentDate: new Date()
	 * })
	 */
	async tick (context, session, options) {
		const currentTriggers = this.getTriggers()

		logger.info(context, 'Processing tick request', {
			triggers: currentTriggers.length
		})

		await Bluebird.map(currentTriggers, async (trigger) => {
			// We don't care about non-time-triggered triggers
			if (!trigger.interval) {
				return null
			}

			const lastExecutionEvent = await this.queue.getLastExecutionEvent(
				context, trigger.id)
			const nextExecutionDate = triggers.getNextExecutionDate({
				data: trigger
			}, lastExecutionEvent)

			// Ignore the trigger if its not time to execute it yet
			if (!nextExecutionDate || options.currentDate < nextExecutionDate) {
				return null
			}

			// This is a time triggered action, so there
			// is no input card that caused the trigger.
			const inputCard = null

			const request = triggers.getRequest(trigger, inputCard, {
				currentDate: options.currentDate,
				matchCard: inputCard,
				context
			})

			// This can happen if the trigger contains
			// an invalid template interpolation
			if (!request) {
				return null
			}

			return this.enqueue(session, request)
		}, {
			concurrency: 5
		})
	}
}
