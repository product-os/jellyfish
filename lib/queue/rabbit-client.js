/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const logger = require('../logger').getLogger(__filename)
const Bluebird = require('bluebird')
const CARDS = require('./cards')
const amqp = require('amqplib')
const _ = require('lodash')
const errors = require('./errors')

const rabbitConnect = async (context, instance, retries = 10) => {
	try {
		logger.info(context, 'Connecting to RabbitMQ', _.omit(instance.options, [ 'password' ]))
		instance.rabbitConnection = await amqp.connect(Object.assign({}, instance.options, {
			protocol: 'amqp'
		}))
	} catch (error) {
		if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
			if (retries <= 0) {
				const summary = `${error.code} - ${error.message}`
				throw new errors.QueueServiceError(`Can't connect to RabbitMQ after ${retries} retries: ${summary}`)
			}

			await Bluebird.delay(2000)
			await rabbitConnect(context, instance, retries - 1)
			return
		}

		throw error
	}

	// Confirm channels allow us to wait until a worker dequeues
	// an action request after enqueuing it.
	// See https://www.rabbitmq.com/confirms.html
	instance.rabbitChannel = await instance.rabbitConnection.createConfirmChannel()

	await instance.rabbitChannel.assertQueue(instance.options.queueName, {
		durable: true
	})
}

const rabbitReconnectHandler = async (context, instance, fn, retries = 10) => {
	try {
		return fn(instance.rabbitChannel, instance.options.queueName)
	} catch (error) {
		if (error.name === 'IllegalOperationError' &&
			error.message === 'Channel closed' &&
			retries > 0) {
			logger.warn(context, 'Reconnecting to RabbitMQ', {
				retries,
				error: {
					name: error.name,
					message: error.message
				}
			})

			await Bluebird.delay(1000)
			await rabbitConnect(context, instance)
			return rabbitReconnectHandler(context, instance, fn, retries - 1)
		}

		error.retries = retries
		throw error
	}
}

module.exports = class RabbitClient {
	constructor (jellyfish, session, options) {
		this.jellyfish = jellyfish
		this.session = session
		this.options = options
		this.rabbitConnection = null
		this.rabbitChannel = null
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
		await rabbitConnect(context, this)
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
	async close () {
		if (!this.rabbitConnection) {
			return
		}

		await this.rabbitChannel.close()
		await this.rabbitConnection.close()
	}

	async sendToQueue (obj) {
		await rabbitReconnectHandler(this.options.context, this, async (channel, name) => {
			const sendToQueue = Bluebird.promisify(channel.sendToQueue, {
				context: channel
			})

			return sendToQueue(name, Buffer.from(JSON.stringify(obj)), {
				persistent: true
			})
		})
	}

	async ack (message) {
		return rabbitReconnectHandler(this.options.context, this, (channel) => {
			return channel.ack(message)
		})
	}
}
