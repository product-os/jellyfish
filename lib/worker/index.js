/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const errio = require('errio')
const _ = require('lodash')
const errors = require('./errors')
const executor = require('./executor')
const utils = require('./utils')
const triggers = require('./triggers')
const CARDS = require('./cards')
const uuid = require('@balena/jellyfish-uuid')
const assert = require('@balena/jellyfish-assert')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)

const runExecutor = async (fn, instance, context, session, typeCard, card, options, patch) => {
	return fn(context, instance.jellyfish, session, typeCard, {
		replace: options.replace,
		triggers: instance.getTriggers(),
		timestamp: options.timestamp,
		reason: options.reason,
		context: instance.getActionContext(context),
		actor: options.actor,
		library: instance.library,
		currentTime: new Date(),
		originator: options.originator,
		attachEvents: options.attachEvents,
		setTriggers: instance.setTriggers.bind(instance),
		executeAction: async (executeSession, actionRequest) => {
			return instance.queue.enqueue(
				instance.getId(), executeSession, actionRequest)
		}
	}, card, patch)
}

const parseTrigger = (context, trigger) => {
	assert.INTERNAL(context, trigger.slug && _.isString(trigger.slug),
		errors.WorkerInvalidTrigger, `Invalid slug: ${trigger.slug}`)
	assert.INTERNAL(context, trigger.id && _.isString(trigger.id),
		errors.WorkerInvalidTrigger, `Invalid id: ${trigger.id}`)
	assert.INTERNAL(context, trigger.action && _.isString(trigger.action),
		errors.WorkerInvalidTrigger, `Invalid action: ${trigger.action}`)
	assert.INTERNAL(context, !trigger.mode || _.isString(trigger.mode),
		errors.WorkerInvalidTrigger, `Invalid mode: ${trigger.mode}`)
	assert.INTERNAL(context,
		trigger.target && (_.isString(trigger.target) || _.isPlainObject(trigger.target) || _.isArray(trigger.target)),
		errors.WorkerInvalidTrigger, `Invalid target: ${trigger.target}`)
	if (_.isArray(trigger.target)) {
		assert.INTERNAL(context,
			trigger.target.length === _.uniq(trigger.target).length,
			errors.WorkerInvalidTrigger, 'Invalid target: it contains duplicates')
	}
	assert.INTERNAL(context,
		(trigger.interval || trigger.filter) && !(trigger.interval && trigger.filter),
		errors.WorkerInvalidTrigger, 'Use either a filter or an interval')
	assert.INTERNAL(context,
		trigger.interval || (trigger.filter && _.isPlainObject(trigger.filter)),
		errors.WorkerInvalidTrigger, `Invalid filter: ${trigger.filter}`)
	assert.INTERNAL(context,
		trigger.filter || (trigger.interval && _.isString(trigger.interval)),
		errors.WorkerInvalidTrigger, `Invalid interval: ${trigger.interval}`)
	assert.INTERNAL(context,
		trigger.arguments && _.isPlainObject(trigger.arguments),
		errors.WorkerInvalidTrigger, `Invalid arguments: ${trigger.arguments}`)

	const result = {
		id: trigger.id,
		slug: trigger.slug,
		action: trigger.action,
		target: trigger.target,
		arguments: trigger.arguments,
		async: trigger.async
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

	if (trigger.mode) {
		result.mode = trigger.mode
	}

	return result
}

module.exports = class Worker {
	/**
	 * @summary The Jellyfish Actions Worker
	 * @class
	 * @public
	 *
	 * @param {Object} jellyfish - jellyfish instance
	 * @param {String} session - worker privileged session id
	 * @param {Object} actionLibrary - action library
	 * @param {Object} consumer - action consumer
	 * @param {Object} producer - action producer
	 *
	 * @example
	 * const worker = new Worker({ ... }, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
	 *     'action-create-card': { ... },
	 *     'action-update-card': { ... },
	 *   },
	 *   consumer,
	 *   producer
	 * )
	 */
	// FIXME worker violates single responsibility principle in that it both handles events and produces tick events
	constructor (jellyfish, session, actionLibrary, consumer, producer) {
		this.jellyfish = jellyfish
		this.triggers = []
		this.errors = errors
		this.session = session
		this.library = actionLibrary
		this.consumer = consumer
		this.producer = producer
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
		this.id = await uuid.random()

		// Insert worker specific cards first
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card)
		})

		// Then load up the library
		await Bluebird.map(_.map(_.values(this.library), 'card'), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card)
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
			defaults: this.jellyfish.defaults,
			getEventSlug: utils.getEventSlug,
			getCardById: _.bind(function (lsession, id) {
				return this.jellyfish.getCardById(context, lsession, id)
			}, this),
			getCardBySlug: _.bind(function (lsession, slug) {
				return this.jellyfish.getCardBySlug(context, lsession, slug)
			}, this),
			query: _.bind(function (lsession, schema, options) {
				return this.jellyfish.query(context, lsession, schema, options)
			}, this),
			privilegedSession: this.session,
			insertCard: _.bind(function (lsession, typeCard, options, card) {
				return this.insertCard(context, lsession, typeCard, options, card)
			}, this),
			replaceCard: _.bind(function (lsession, typeCard, options, card) {
				return this.replaceCard(context, lsession, typeCard, options, card)
			}, this),
			patchCard: _.bind(function (lsession, typeCard, options, card, patch) {
				return this.patchCard(context, lsession, typeCard, options, card, patch)
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
	 * @param {Date} [options.timestamp] - Upsert timestamp
	 * @param {Object} card - The card that should be inserted
	 *
	 * @returns {Object} inserted card
	 */
	insertCard (context, insertSession, typeCard, options, card) {
		return runExecutor(executor.insertCard, this, context,
			insertSession, typeCard, card, {
				timestamp: options.timestamp,
				reason: options.reason,
				actor: options.actor,
				originator: options.originator,
				attachEvents: options.attachEvents
			})
	}

	/**
	 * @summary Patch a card
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} insertSession - The Jellyfish session to insert the card with
	 * @param {Object} typeCard - The type card for the card that will be inserted
	 * @param {Object} options - options
	 * @param {Date} [options.timestamp] - Upsert timestamp
	 * @param {Object} card - The card that should be inserted
	 * @param {Object[]} patch - JSON Patch
	 *
	 * @returns {Object} inserted card
	 */
	patchCard (context, insertSession, typeCard, options, card, patch) {
		return runExecutor(executor.patchCard, this, context, insertSession, typeCard, card, {
			timestamp: options.timestamp,
			reason: options.reason,
			actor: options.actor,
			originator: options.originator,
			attachEvents: options.attachEvents
		}, patch)
	}

	/**
	 * @summary Replace a card
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} insertSession - The Jellyfish session to insert the card with
	 * @param {Object} typeCard - The type card for the card that will be inserted
	 * @param {Object} options - options
	 * @param {Date} [options.timestamp] - Upsert timestamp
	 * @param {Object} card - The card that should be inserted
	 *
	 * @returns {Object} replaced card
	 */
	replaceCard (context, insertSession, typeCard, options, card) {
		return runExecutor(executor.replaceCard, this, context, insertSession, typeCard, card, {
			timestamp: options.timestamp,
			reason: options.reason,
			actor: options.actor,
			originator: options.originator,
			attachEvents: options.attachEvents
		})
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
			return parseTrigger(context, trigger)
		})
	}

	/**
		* @summary Upsert a single registered trigger
		* @function
		* @public
		* @param {Object} context - execution context
		* @param {Object} card - trigger card
		* @example
		* const worker = new Worker({ ... })
		* worker.upsertTrigger({ ... })
		*/
	upsertTrigger (context, card) {
		logger.info(context, 'Upserting trigger', {
			slug: card.slug
		})

		const trigger = parseTrigger(context, card)

		// Find the index of an existing trigger with the same id
		const existingTriggerIndex = _.findIndex(this.triggers, {
			id: trigger.id
		})

		if (existingTriggerIndex === -1) {
			// If an existing trigger is not found, add the trigger
			this.triggers.push(trigger)
		} else {
			// If an existing trigger is found, replace it
			this.triggers.splice(existingTriggerIndex, 1, trigger)
		}
	}

	/**
		* @summary Remove a single registered trigger
		* @function
		* @public
		* @param {Object} context - execution context
		* @param {Object} slug - slug of trigger card
		* @example
		* const worker = new Worker({ ... })
		* worker.removeTrigger('trigger-ed3c21f2-fa5e-4cdf-b862-392a2697abe4')
		*/
	removeTrigger (context, slug) {
		logger.info(context, 'Removing trigger', {
			slug
		})

		this.triggers = _.reject(this.triggers, {
			slug
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
	 * @summary Execute the "pre" hook of an action request
	 * @function
	 * @public
	 *
	 * @description
	 * The "pre" hook of an action request is meant to run before
	 * the action request is enqueued. The hook may return a
	 * modified set of arguments.
	 *
	 * @param {String} session - session id
	 * @param {Object} request - action request options
	 * @returns {(Object|Undefined)} request arguments
	 */
	async pre (session, request) {
		const actionDefinition = this.library[request.action.split('@')[0]]
		assert.USER(request.context,
			actionDefinition,
			errors.WorkerInvalidAction, `No such action: ${request.action}`)

		const modifiedArguments = await actionDefinition.pre(session,
			this.getActionContext(request.context),
			request)

		request.arguments = modifiedArguments || request.arguments
		return request
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
			request.data.context, session, request.data.action)

		assert.USER(request.context, actionCard,
			errors.WorkerInvalidAction, `No such action: ${request.data.action}`)

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

			const logData = {
				error: errorObject,
				input: request.data.input,
				action: actionCard.slug,
				time: endDate.getTime() - startDate.getTime()
			}

			if (error.expected) {
				logger.warn(request.data.context, 'Execute error', logData)
			} else {
				logger.error(request.data.context, 'Execute error', logData)
			}

			return {
				error: true,
				data: errorObject
			}
		})

		const event = await this.consumer.postResults(
			this.getId(), request.data.context, request, result)
		assert.INTERNAL(request.context, event,
			errors.WorkerNoExecuteEvent,
			`Could not create execute event for request: ${request.id}`)

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

			const lastExecutionEvent = await this.producer.getLastExecutionEvent(
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

			const request = await triggers.getRequest(this.jellyfish, trigger, inputCard, {
				currentDate: options.currentDate,
				context,
				session
			})

			// This can happen if the trigger contains
			// an invalid template interpolation
			if (!request) {
				return null
			}

			return this.producer.enqueue(this.getId(), session, request)
		}, {
			concurrency: 5
		})
	}
}
