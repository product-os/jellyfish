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
const errors = require('./errors')
const executor = require('./executor')
const utils = require('./utils')
const triggers = require('./triggers')
const MemoryQueue = require('./memory-queue')
const jellyscript = require('../jellyscript')
const queue = require('../queue')
const logger = require('../logger').getLogger(__filename)
const ctx = require('../logger/context')

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
		const execContext = ctx.newWorkerContext()

		this.context = {
			errors,
			getEventSlug: utils.getEventSlug,
			getCardById: _.bind(function (lsession, id, options = {}) {
				options.ctx = execContext
				return this.jellyfish.getCardById(execContext, lsession, id, options)
			}, this),
			getCardBySlug: _.bind(function (lsession, slug, options = {}) {
				options.ctx = execContext
				return this.jellyfish.getCardBySlug(execContext, lsession, slug, options)
			}, this),
			query: _.bind(function (lsession, schema, options = {}) {
				options.ctx = execContext
				return this.jellyfish.query(execContext, lsession, schema, options)
			}, this),
			privilegedSession: session,
			insertCard: this.insertCard.bind(this),
			execContext
		}
	}

	/**
	 * @summary Get the action execution context
	 * @function
	 * @protected
	 *
	 * @param {Object} execCtx - execution context
	 *
	 * @returns {Object} execution context
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const context = worker.getExecutionContext()
	 */
	getExecutionContext (execCtx) {
		if (!_.isNil(execCtx)) {
			return {
				errors,
				getEventSlug: utils.getEventSlug,
				getCardById: _.bind(function (session, id, options = {}) {
					return this.jellyfish.getCardById(execCtx, session, id, options)
				}, this),
				getCardBySlug: _.bind(function (session, slug, options = {}) {
					return this.jellyfish.getCardBySlug(execCtx, session, slug, options)
				}, this),
				query: _.bind(function (session, schema, options = {}) {
					options.ctx = execCtx
					return this.jellyfish.query(execCtx, session, schema, options)
				}, this),
				privilegedSession: this.context.session,
				insertCard: _.bind(function (insertSession, typeCard, options, card) {
					return this.insertCard(insertSession, typeCard, options, card, execCtx)
				}, this),
				execContext: execCtx
			}
		}
		return this.context
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
	 * @param {Date} [options.timestamp] - Upsert timestamp
	 * @param {Object} card - The card that should be inserted
	 * @param {Object} context - execution context
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
	insertCard (insertSession, typeCard, options, card, context) {
		const execCtx = ctx.mergeContext(this.getExecutionContext().execContext, context)
		return executor.insertCard(this.jellyfish, insertSession, typeCard, {
			override: options.override,
			triggers: this.getTriggers(),
			timestamp: options.timestamp,
			currentTime: new Date(),
			attachEvents: options.attachEvents,
			setTriggers: this.setTriggers.bind(this),
			executeAction: async (executeSession, actionRequest) => {
				actionRequest.ctx = execCtx
				return this.enqueue(executeSession, actionRequest)
			}
		}, card, execCtx)
	}

	/**
	 * @summary Set all registered triggers
	 * @function
	 * @public
	 *
	 * @param {Object[]} objects - triggers
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * worker.setTriggers([ ... ])
	 */
	setTriggers (objects) {
		logger.info(ctx, 'Setting triggers', {
			count: objects.length
		})

		this.triggers = objects.map((trigger) => {
			if (!trigger.id || !_.isString(trigger.id)) {
				throw new errors.WorkerInvalidTrigger(`Invalid id: ${trigger.id}`,
					this.getExecutionContext().execContext)
			}

			if (!trigger.action || !_.isString(trigger.action)) {
				throw new errors.WorkerInvalidTrigger(`Invalid action: ${trigger.action}`,
					this.getExecutionContext().execContext)
			}

			if (!trigger.card || (!_.isString(trigger.card) && !_.isPlainObject(trigger.card))) {
				throw new errors.WorkerInvalidTrigger(`Invalid card: ${trigger.card}`,
					this.getExecutionContext().execContext)
			}

			if (!trigger.type || (!_.isString(trigger.type) && !_.isPlainObject(trigger.type))) {
				throw new errors.WorkerInvalidActionRequest(`Invalid type: ${trigger.type}`,
					this.getExecutionContext().execContext)
			}

			if (trigger.interval && trigger.filter) {
				throw new errors.WorkerInvalidTrigger('Use either a filter or an interval',
					this.getExecutionContext().execContext)
			}

			if (!trigger.interval && (!trigger.filter || !_.isPlainObject(trigger.filter))) {
				throw new errors.WorkerInvalidTrigger(`Invalid filter: ${trigger.filter}`,
					this.getExecutionContext().execContext)
			}

			if (!trigger.filter && (!trigger.interval || !_.isString(trigger.interval))) {
				throw new errors.WorkerInvalidTrigger(`Invalid interval: ${trigger.interval}`,
					this.getExecutionContext().execContext)
			}

			if (!trigger.arguments || !_.isPlainObject(trigger.arguments)) {
				throw new errors.WorkerInvalidTrigger(`Invalid arguments: ${trigger.arguments}`,
					this.getExecutionContext().execContext)
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
		const request = await this.queue.dequeue()

		if (request) {
			logger.info(ctx, 'Dequeueing request', {
				request: {
					id: request.id,
					card: request.card,
					type: request.type,
					actor: request.actor,
					action: request.action.slug
				},
				length: await this.length()
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
	 * @param {Object} [options.ctx] - execution context
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
		logger.info(ctx, 'Enqueueing request', {
			request: {
				action: options.action,
				card: options.card,
				type: options.type
			},
			length: await this.length()
		})

		const execCtx = ctx.mergeContext(this.getExecutionContext().execContext, options.ctx)

		if (!options.type) {
			throw new errors.WorkerInvalidActionRequest('Missing input card type')
		}

		const cards = await Bluebird.props({
			target: this.jellyfish.getCardBySlug(execCtx, session, options.card, {
				type: options.type
			}),
			action: this.jellyfish.getCardBySlug(execCtx, session, options.action, {
				type: 'action'
			}),
			session: this.jellyfish.getCardById(execCtx, session, session, {
				type: 'session'
			})
		})

		if (!cards.action) {
			throw new errors.WorkerInvalidAction(`No such action: ${options.action}`, execCtx)
		}

		const targetId = cards.target ? cards.target.id : options.card

		const date = options.currentDate || new Date()
		const request = {
			id: uuid(),
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
			),
			ctx: execCtx
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
		logger.info(ctx, 'Executing request', {
			request: {
				id: request.id,
				card: request.card,
				type: request.type,
				actor: request.actor,
				action: request.action.slug
			},
			length: await this.length()
		})

		const execCtx = request.ctx
		const result = await executor.run(this.jellyfish, session,
			this.getExecutionContext(),
			this.library,
			request
		).then((data) => {
			logger.info(ctx, 'Execute success', {
				data
			})

			return {
				error: false,
				data
			}
		}).catch((error) => {
			logger.error(ctx, 'Execute error', {
				error: {
					message: error.message,
					name: error.name,
					stack: error.stack
				}
			})

			return {
				error: true,
				data: {
					message: error.message,
					type: error.name
				}
			}
		})

		const event = await queue.postResults(this.jellyfish, session, {
			id: request.id,
			action: request.action.id,
			originator: request.originator,
			card: request.card,
			actor: request.actor,
			timestamp: request.timestamp
		}, result, execCtx)

		if (!event) {
			throw new errors.WorkerNoExecuteEvent(
				`Could not create execute event for request: ${request.id}`)
		}

		logger.info(execCtx, 'Execute event posted', {
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
	 * @param {String} session - session id
	 * @param {Object} options - options
	 * @param {Date} options.currentDate - current date
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 *
	 * await worker.tick(session, {
	 *   currentDate: new Date()
	 * })
	 */
	async tick (session, options) {
		const currentTriggers = this.getTriggers()

		logger.info(ctx, 'Processing tick request', {
			triggers: currentTriggers.length
		})

		await Bluebird.map(currentTriggers, async (trigger) => {
			// We don't care about non-time-triggered triggers
			if (!trigger.interval) {
				return null
			}

			const lastExecutionEvent = await queue.getLastExecutionEvent(
				this.jellyfish, session, trigger.id, this.getExecutionContext())
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
				matchCard: inputCard
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
