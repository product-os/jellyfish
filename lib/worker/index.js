/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const errio = require('errio')
const _ = require('lodash')
const errors = require('./errors')
const executor = require('./executor')
const utils = require('./utils')
const triggers = require('./triggers')
const CARDS = require('./cards')
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
		this.id = uuid()
	}

	/**
	 * @summary Get this worker's unique id
	 * @function
	 * @public
	 *
	 * @returns {String} unique worker id
	 *
	 * @example
	 * const worker = new Worker({ ... })
	 * const id = worker.getId()
	 * console.log(id)
	 */
	getId () {
		return this.id
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
		// Insert worker specific cards first
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.insertCard(context, this.session, card, {
				override: true
			})
		})

		// Then load up the library
		await Bluebird.map(_.map(_.values(this.library), 'card'), async (card) => {
			return this.jellyfish.insertCard(context, this.session, card, {
				override: true
			})
		})
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
			context: this.getActionContext(context),
			actor: options.actor,
			library: this.library,
			currentTime: new Date(),
			attachEvents: options.attachEvents,
			setTriggers: this.setTriggers.bind(this),
			executeAction: async (executeSession, actionRequest) => {
				return this.queue.enqueue(this.getId(), executeSession, actionRequest)
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
		logger.info(request.data.context, 'Executing request', {
			request: {
				id: request.id,
				card: request.data.input.id,
				type: request.data.input.type,
				actor: request.data.actor,
				action: request.data.action
			}
		})

		const actionCard = await this.jellyfish.getCardBySlug(
			request.data.context, session, request.data.action, {
				type: 'action'
			})

		if (!actionCard) {
			throw new errors.WorkerInvalidAction(
				`No such action: ${request.data.action}`)
		}

		const startDate = new Date()
		const result = await executor.run(this.jellyfish, session,
			this.getActionContext(request.data.context),
			this.library,
			{
				context: request.data.context,
				card: request.data.input.id,
				type: request.data.input.type,
				actor: request.data.actor,
				action: actionCard,
				timestamp: request.data.timestamp,
				arguments: request.data.arguments,
				epoch: request.data.epoch
			}
		).then((data) => {
			const endDate = new Date()
			logger.info(request.data.context, 'Execute success', {
				data,
				input: request.data.input,
				action: actionCard.slug,
				time: endDate.getTime() - startDate.getTime()
			})

			return {
				error: false,
				data
			}
		}).catch((error) => {
			const endDate = new Date()
			const errorObject = errio.toObject(error, {
				stack: true
			})

			logger.error(request.data.context, 'Execute error', {
				error: errorObject,
				input: request.data.input,
				action: actionCard.slug,
				time: endDate.getTime() - startDate.getTime()
			})

			return {
				error: true,
				data: errorObject
			}
		})

		const event = await this.queue.postResults(
			this.getId(), request.data.context, request, result)
		if (!event) {
			throw new errors.WorkerNoExecuteEvent(
				`Could not create execute event for request: ${request.id}`)
		}

		logger.info(request.data.context, 'Execute event posted', {
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

			return this.queue.enqueue(this.getId(), session, request)
		}, {
			concurrency: 5
		})
	}
}
