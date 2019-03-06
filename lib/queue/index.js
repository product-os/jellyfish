/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const logger = require('../logger').getLogger(__filename)
const environment = require('../environment')
const jellyscript = require('../jellyscript')
const events = require('./events')
const errors = require('./errors')
const CARDS = require('./cards')

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by'
}

const getExecuteLinkSlug = (actionRequest) => {
	return `link-execute-${actionRequest.slug}`
}

const isUUID = (string) => {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
		.test(string)
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
	}, {
		// As a debug assert mechanism
		override: !environment.isProduction()
	})
}

const pickNextUnexecutedRequest = async (context, jellyfish, session, actor, skip = 0) => {
	logger.debug(context, 'Finding next unexecuted request', {
		skip
	})

	const queryStartDate = new Date()
	const limit = 20
	const results = await jellyfish.getPendingRequests(context, session, {
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
		return null
	}

	// We shuffle the requests to reduce the chance of
	// worker locking conflicts
	for (const actionRequest of _.shuffle(results)) {
		logger.debug(context, 'Locking non executed request', {
			slug: actionRequest.slug
		})

		if (!await jellyfish.lock(actor, actionRequest.slug)) {
			continue
		}

		logger.debug(context, 'Locking non executed request success', {
			slug: actionRequest.slug
		})

		// Also check the link cards as a last resort,
		// just in case the materialization failed
		const executeLink = await jellyfish.getCardBySlug(
			context, session, getExecuteLinkSlug(actionRequest), {
				type: 'link'
			})
		if (executeLink) {
			logger.debug(context, 'Omitting non executed request because of link card', {
				slug: actionRequest.slug,
				link: executeLink.slug
			})

			await jellyfish.unlock(actor, actionRequest.slug)
			continue
		}

		logger.debug(context, 'Non executed request found', {
			slug: actionRequest.slug
		})

		return actionRequest
	}

	logger.debug(context, 'No match in collection', {
		limit
	})

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
		logger.info(context, 'Inserting essential cards')
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.insertCard(context, this.session, card, {
				override: true
			})
		})
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
	// eslint-disable-next-line class-methods-use-this
	async destroy () {
		return Bluebird.resolve()
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

		if (!request) {
			throw new errors.QueueNoRequest(
				`Request not found: ${JSON.stringify(actionRequest, null, 2)}`)
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

		await linkExecuteEvent(
			this.jellyfish, context, this.session, eventCard, actionRequest)
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
		const actionRequest = await pickNextUnexecutedRequest(
			context, this.jellyfish, this.session, actor)
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
	 * @param {String} options.type - action input card type
	 * @param {Object} options.arguments - action arguments
	 * @param {Date} [options.currentDate] - current date
	 * @param {String} [options.originator] - card id that originated this action
	 * @param {Object} [options.context] - execution context
	 * @returns {Object} action request
	 */
	async enqueue (actor, session, options) {
		const slug = `action-request-${uuid()}`

		logger.info(options.context, 'Enqueueing request', {
			actor,
			request: {
				slug,
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

		if (!isUUID(options.card) && !cards.target) {
			throw new errors.QueueInvalidRequest(
				`No such input card: ${options.card}`, options.context)
		}

		const targetId = cards.target ? cards.target.id : options.card
		const date = options.currentDate || new Date()
		return this.jellyfish.insertCard(options.context, session, {
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
}
