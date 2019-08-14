/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const logger = require('../logger').getLogger(__filename)
const events = require('./events')
const errors = require('./errors')
const CARDS = require('./cards')
const uuid = require('../uuid')
const assert = require('../assert')
const QUEUE_BUFFER = 20

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by'
}

const getExecuteLinkSlug = (actionRequest) => {
	return `link-execute-${actionRequest.slug}`
}

const linkExecuteEvent = (jellyfish, context, session, eventCard, actionRequest) => {
	return jellyfish.insertCard(context, session, {
		slug: getExecuteLinkSlug(actionRequest),
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
}

// Re-post execute event in order to tell the core about the fact
// that this request has already been executed, so it gets removed
// from the queue and prevents workers from spinning on it in vain.
const repostExecuteEvent = async (context, jellyfish, session, executeCard, request) => {
	const newExecuteCard = _.cloneDeep(executeCard)
	Reflect.deleteProperty(newExecuteCard, 'id')
	const suffix = await uuid.random()
	newExecuteCard.slug = `execute-nudge-${request.id}-${suffix}`
	return jellyfish.insertCard(
		context, session, newExecuteCard)
}

const claimRequest = async (context, instance, actor, request) => {
	assert.INTERNAL(context, request.slug,
		errors.QueueInvalidRequest,
		`Request has no slug: ${JSON.stringify(request, null, 2)}`)

	logger.debug(context, 'Locking non executed request', {
		slug: request.slug
	})

	if (!await instance.jellyfish.lock(
		context, instance.session, actor, request)) {
		return null
	}

	logger.info(context, 'Locked non executed request', {
		slug: request.slug
	})

	/*
	 * This is important to check now that we consume requests from
	 * a materialised view, as we might have executed the action and
	 * posted an execute event, but the request will not get out of the
	 * queue (and we will keep trying to execute it over and over)
	 * until materialized view is refreshed, which is eventually
	 * consistent.
	 */
	const executeCard = await instance.jellyfish.getCardBySlug(
		context, instance.session, events.getExecuteEventSlug(request), {
			type: 'execute'
		})
	if (executeCard) {
		logger.info(context, 'Omitting non executed request because of execute card', {
			slug: request.slug,
			execute: executeCard.slug
		})

		await repostExecuteEvent(
			context, instance.jellyfish, instance.session, executeCard, request)
		await instance.jellyfish.unlock(
			context, instance.session, actor, request)
		return null
	}

	// Also check the link cards as a last resort,
	// just in case the materialization failed
	const executeLink = await instance.jellyfish.getCardBySlug(
		context, instance.session, getExecuteLinkSlug(request), {
			type: 'link'
		})
	if (executeLink) {
		logger.info(context, 'Omitting non executed request because of link card', {
			slug: request.slug,
			link: executeLink.slug
		})

		await repostExecuteEvent(
			context, instance.jellyfish, instance.session, executeCard, request)
		await instance.jellyfish.unlock(
			context, instance.session, actor, request)
		return null
	}

	logger.debug(context, 'Non executed request found', {
		slug: request.slug
	})

	return request
}

const pickNextUnexecutedRequest = async (instance, context, actor, skip = 0) => {
	logger.debug(context, 'Finding next unexecuted request', {
		skip
	})

	const queryStartDate = new Date()
	const limit = QUEUE_BUFFER
	const hasPriority = instance.options.enablePriorityBuffer && instance.priority.length > 0

	/*
	 * Prefer the priority buffer if available.
	 */
	const results = hasPriority
		? instance.priority

		// This query is understood and optimised by the backend
		// implementation. Make sure it remains fast is you
		// change it.
		: await instance.jellyfish.query(context, instance.session, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					const: 'action-request'
				}
			}
		}, {
			skip: limit * skip,
			limit
		})

	const queryEndDate = new Date()
	logger.debug(context, 'Non executed requests query response', {
		skip,
		length: results.length,
		slug: results[0] && results[0].slug,
		time: queryEndDate.getTime() - queryStartDate.getTime()
	})

	// All action requests were processed
	if (results.length <= 0) {
		/*
		 * If we processed a priority buffer, then continue
		 * from where we were before.
		 */
		if (hasPriority) {
			return pickNextUnexecutedRequest(instance, context, actor, skip)
		}

		return null
	}

	// We shuffle the requests to reduce the chance of
	// worker locking conflicts
	for (const actionRequest of _.shuffle(results)) {
		const result = await claimRequest(
			context, instance, actor, actionRequest)

		/*
		 * We need to manually maintain the priority buffer.
		 */
		if (hasPriority) {
			_.pull(results, actionRequest)
		}

		if (!result) {
			continue
		}

		return result
	}

	logger.debug(context, 'No match in collection', {
		limit
	})

	/*
	 * If we were dealing with a priority buffer, then continue from
	 * where we were before.
	 */
	if (hasPriority) {
		return pickNextUnexecutedRequest(instance, context, actor, skip)
	}

	return pickNextUnexecutedRequest(instance, context, actor, skip + 1)
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
	 * @param {Object} [options] - options
	 * @param {Boolean} [options.enablePriorityBuffer] - enable priority buffers
   */
	constructor (context, jellyfish, session, options = {}) {
		super()
		this.context = context
		this.jellyfish = jellyfish
		this.session = session
		this.errors = errors
		this.priority = []
		this.options = options
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
		logger.info(context, 'Inserting essential cards')
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card)
		})

		if (this.options.enablePriorityBuffer) {
			logger.info(context, 'Starting priority buffer stream')
			this.stream = await this.jellyfish.stream(context, this.session, {
				type: 'object',
				additionalProperties: true,
				required: [ 'type', 'slug', 'active' ],
				properties: {
					slug: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'action-request'
					},
					active: {
						type: 'boolean',
						const: true
					}
				}
			})

			this.stream.on('error', (error) => {
				this.emit('error', error)
			})

			this.stream.on('data', (change) => {
				// We're only interested in new elements
				if (change.before) {
					return
				}

				logger.info(context, 'Pushing request to priority buffer', {
					slug: change.after.slug
				})

				this.priority.push(change.after)

				/*
				 * Prevent the priority buffer from growing indefinitely.
				 */
				if (this.priority.length > QUEUE_BUFFER) {
					this.priority = this.priority.slice(
						this.priority.length - QUEUE_BUFFER)
				}
			})
		}
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
		if (this.options.enablePriorityBuffer) {
			await new Bluebird((resolve, reject) => {
				this.stream.once('error', (error) => {
					this.stream.removeAllListeners()
					reject(error)
				})

				this.stream.once('closed', () => {
					this.stream.removeAllListeners()
					resolve()
				})

				this.stream.close()
			})
		}
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
		logger.info(context, 'Waiting request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action
			}
		})

		const request = await events.wait(
			context, this.jellyfish, this.session, {
				id: actionRequest.id,
				actor: actionRequest.data.actor
			})

		logger.info(context, 'Got request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action
			}
		})

		assert.INTERNAL(context, request,
			errors.QueueNoRequest,
			`Request not found: ${JSON.stringify(actionRequest, null, 2)}`)
		assert.INTERNAL(context, request.data.payload,
			errors.QueueInvalidRequest,
			`Execute event has no payload: ${JSON.stringify(request, null, 2)}`)

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

		await linkExecuteEvent(
			this.jellyfish, context, this.session, eventCard, actionRequest)

		logger.info(context, 'Unlocking action request after results', {
			slug: actionRequest.slug,
			execute: eventCard.slug
		})

		await this.jellyfish.unlock(
			context, this.session, actor, actionRequest)
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
	 * @summary Dequeue a request
	 * @function
	 * @public
	 *
	 * @param {Object} context - execution context
	 * @param {String} actor - actor
	 * @returns {(Object|Null)} request
	 */
	async dequeue (context, actor) {
		const startDate = new Date()
		const actionRequest = await pickNextUnexecutedRequest(this, context, actor)
		if (!actionRequest) {
			return null
		}

		const endDate = new Date()
		logger.info(actionRequest.data.context, 'Dequeueing request', {
			actor,
			time: endDate.getTime() - startDate.getTime(),
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
	 * @param {Object} options.arguments - action arguments
	 * @param {Date} [options.currentDate] - current date
	 * @param {String} [options.originator] - card id that originated this action
	 * @param {Object} [options.context] - execution context
	 * @returns {Object} action request
	 */
	async enqueue (actor, session, options) {
		const id = await uuid.random()
		const slug = `action-request-${id}`

		logger.info(options.context, 'Enqueueing request', {
			actor,
			request: {
				slug,
				action: options.action,
				card: options.card
			}
		})

		// Use the request session to retrieve the various cards, this ensures that
		// the action cannot be run if the session doesn't have access to the cards.
		const cards = await Bluebird.props({
			target: uuid.isUUID(options.card) ? {
				id: options.card
			} : this.jellyfish.getCardBySlug(
				options.context, session, options.card),
			action: this.jellyfish.getCardBySlug(
				options.context, session, options.action, {
					type: 'action'
				}),
			session: this.jellyfish.getCardById(
				options.context, session, session, {
					type: 'session'
				})
		})

		assert.INTERNAL(options.context, cards.session,
			errors.QueueInvalidSession,
			`No such session: ${session}`)
		assert.USER(options.context, cards.action,
			errors.QueueInvalidAction,
			`No such action: ${options.action}`)
		assert.USER(options.context, cards.target,
			errors.QueueInvalidRequest,
			`No such input card: ${options.card}`)

		const date = options.currentDate || new Date()

		// Use the Queue's session instead of the session passed as a parameter as the
		// passed session shouldn't have permissions to create action requests
		return this.jellyfish.insertCard(options.context, this.session, {
			type: 'action-request',
			slug,
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: options.context,
				originator: options.originator,
				actor: cards.session.data.actor,
				action: cards.action.slug,
				input: {
					id: cards.target.id
				},
				arguments: options.arguments
			}
		})
	}
}
