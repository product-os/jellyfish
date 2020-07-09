/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const events = require('./events')
const Bluebird = require('bluebird')
const graphileWorker = require('graphile-worker')
const logger = require('@balena/jellyfish-logger').getLogger(__filename)
const CARDS = require('./cards')
const environment = require('@balena/jellyfish-environment')
const metrics = require('@balena/jellyfish-metrics')

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by'
}

const EXECUTE_LINK_VERSION = '1.0.0'

const RUN_RETRIES = 10
const RUN_RETRY_DELAY = 1000

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

module.exports = class Consumer {
	constructor (jellyfish, session) {
		this.jellyfish = jellyfish
		this.session = session
		this.messagesBeingHandled = 0
		this.graphileRunner = null
	}

	async initializeWithEventHandler (context, onMessageEventHandler) {
		logger.info(context, 'Inserting essential cards')
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card)
		})

		await this.run(context, onMessageEventHandler)
		this.graphileRunner.stop = _.once(this.graphileRunner.stop)
	}

	async run (context, onMessageEventHandler, retries = RUN_RETRIES) {
		try {
			this.graphileRunner = await graphileWorker.run({
				noHandleSignals: true,
				pgPool: this.jellyfish.backend.connection.$pool,
				concurrency: environment.queue.concurrency,
				pollInterval: 1000,
				logger: new graphileWorker.Logger((scope) => {
					return _.noop
				}),
				taskList: {
					actionRequest: async (payload, helpers) => {
						const action = payload.data.action.split('@')[0]
						try {
							this.messagesBeingHandled++
							metrics.markJobAdd(action, context.id)
							await onMessageEventHandler(payload)
						} finally {
							this.messagesBeingHandled--
							metrics.markJobDone(action, context.id, payload.data.timestamp)
						}
					}
				}
			})
		} catch (error) {
			if (retries > 0) {
				logger.info(context, 'Graphile worker failed to run', {
					retries,
					error
				})
				await Bluebird.delay(RUN_RETRY_DELAY)
				return this.run(context, onMessageEventHandler, retries - 1)
			}
			throw error
		}

		return true
	}

	async cancel () {
		if (this.graphileRunner) {
			await this.graphileRunner.stop()
		}
		while (this.messagesBeingHandled > 0) {
			await Bluebird.delay(10)
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
