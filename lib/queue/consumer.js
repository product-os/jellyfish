/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const RabbitClient = require('./rabbit-client')
const events = require('./events')
const _ = require('lodash')
const EventEmitter = require('events').EventEmitter
const Bluebird = require('bluebird')

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by'
}

const EXECUTE_LINK_VERSION = '1.0.0'

const getExecuteLinkSlug = (actionRequest) => {
	return `link-execute-${actionRequest.slug}`
}

const linkExecuteEvent = (jellyfish, context, session, eventCard, actionRequest) => {
	return jellyfish.insertCard(context, session, {
		slug: getExecuteLinkSlug(actionRequest),
		type: 'link@1.0.0',
		version: EXECUTE_LINK_VERSION,
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

const isCancelledMessage = _.isNil

module.exports = class Consumer extends RabbitClient {
	constructor (jellyfish, session, options) {
		super(jellyfish, session, options)

		this.messagesBeingHandled = 0
		this.eventEmitter = new EventEmitter()
	}

	async initializeWithEventHandler (context, onMessageEventHandler) {
		await super.initialize(context)

		this.consumerTag = context.id

		// Only deal with one message at a time
		this.rabbitChannel.prefetch(1)

		this.eventEmitter.on('message', async (request, message) => {
			try {
				this.messagesBeingHandled++
				await onMessageEventHandler(request)
			} finally {
				// Ack even in the case of an error,
				// otherwise we risk getting into an infinite loop
				// trying to execute the same action over and over
				// again, even though it executed fine the first time
				// but we failed to post the results back.
				await this.ack(message)

				this.messagesBeingHandled--
			}
		})

		this.rabbitChannel.consume(this.options.queueName, (message) => {
			if (isCancelledMessage(message)) {
				return
			}

			const request = JSON.parse(message.content.toString())

			// This helps saving memory
			Reflect.deleteProperty(message, 'content')

			this.eventEmitter.emit('message', request, message)
		}, {
			consumerTag: this.consumerTag
		})
	}

	async cancel () {
		await this.rabbitChannel.cancel(this.consumerTag)
		while (this.messagesBeingHandled > 0) {
			await Bluebird.delay(10)
		}
	}

	async close () {
		this.eventEmitter.removeAllListeners()
		await super.close()
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
		const eventCard = await events.post(
			context, this.jellyfish, this.session, {
				action: actionRequest.data.action,
				actor: actionRequest.data.actor,
				id: actionRequest.id,
				card: actionRequest.data.input.id,
				timestamp: actionRequest.data.timestamp,
				originator: actionRequest.data.originator
			}, results)

		await linkExecuteEvent(
			this.jellyfish, context, this.session, eventCard, actionRequest)

		return eventCard
	}
}
