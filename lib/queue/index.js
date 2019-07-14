/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const amqp = require('amqplib')
const EventEmitter = require('events').EventEmitter
const logger = require('../logger').getLogger(__filename)
const events = require('./events')
const errors = require('./errors')
const CARDS = require('./cards')
const uuid = require('../uuid')
const assert = require('../assert')

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

module.exports = class Queue extends EventEmitter {
	/**
   * @summary The actions queue
   * @class
   * @public
   *
	 * @param {Object} context - execution context
	 * @param {Object} jellyfish - jellyfish instance
	 * @param {String} session - session id
	 * @param {Object} options - options
   */
	constructor (context, jellyfish, session, options) {
		super()
		this.context = context
		this.jellyfish = jellyfish
		this.session = session
		this.errors = errors
		this.options = options
		this.rabbit = {}
		this.rabbit.messages = {}
		this.consumer = false
		this.onConsume = (message) => {
			// A cancelled message
			if (!message) {
				return
			}

			const slug = message.content.toString()
			this.rabbit.currentMessage = message
			this.rabbit.messages[slug] = message
		}
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

		this.rabbit.connection = await amqp.connect(this.options)

		// Confirm channels allow us to wait until a worker dequeues
		// an action request after enqueuing it.
		// See https://www.rabbitmq.com/confirms.html
		this.rabbit.channel = await this.rabbit.connection.createConfirmChannel()

		await this.rabbit.channel.assertQueue(this.options.name, {
			durable: true
		})

		// Only deal with one message at a time
		this.rabbit.channel.prefetch(1)
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
		if (this.rabbit.connection) {
			await this.rabbit.channel.close()
			await this.rabbit.connection.close()
		}

		this.consumer = false
		Reflect.deleteProperty(this, 'rabbit')
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

		const message = this.rabbit.messages[actionRequest.slug]
		assert.INTERNAL(context, message,
			errors.QueueInvalidRequest,
			`No such action request message: ${actionRequest.slug}`)
		this.rabbit.channel.ack(message)

		// Don't keep storing every action request message forever
		Reflect.deleteProperty(this.rabbit.messages, actionRequest.slug)

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
		// Lazy load the consume part when needed
		if (!this.consumer) {
			this.consumer = true
			this.rabbit.channel.consume(
				this.options.name, this.onConsume)
		}

		if (!this.rabbit.currentMessage) {
			// As a nicety to prevent clients accidentally choking
			// the synchronous thread if polling the queue.
			await Bluebird.delay(1)
			return null
		}

		const startDate = new Date()
		const slug = this.rabbit.currentMessage.content.toString()
		const actionRequest = await this.jellyfish.getCardBySlug(
			context, this.session, slug, {
				type: 'action-request'
			})

		if (!actionRequest) {
			// As a nicety to prevent clients accidentally choking
			// the synchronous thread if polling the queue.
			await Bluebird.delay(1)
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

		Reflect.deleteProperty(this.rabbit, 'currentMessage')
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
		const request = await this.jellyfish.insertCard(
			options.context, this.session, {
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

		// The .sendToQueue() method does not return
		// a promise but uses a callback, even in
		// promise mode.
		await new Promise((resolve, reject) => {
			this.rabbit.channel.sendToQueue(
				this.options.name,
				Buffer.from(slug), {
					persistent: true
				}, (error, ok) => {
					if (error) {
						return reject(error)
					}

					return resolve()
				})
		})

		return request
	}
}
