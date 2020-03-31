/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const _ = require('lodash')
const events = require('./events')
const Bluebird = require('bluebird')
const graphileWorker = require('graphile-worker')
const logger = require('../logger').getLogger(__filename)
const CARDS = require('./cards')

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

		this.graphileRunner = await graphileWorker.run({
			noHandleSignals: true,
			pgPool: this.jellyfish.backend.connection.$pool,
			concurrency: 1,
			pollInterval: 1000,
			logger: new graphileWorker.Logger((scope) => {
				return _.noop
			}),
			taskList: {
				actionRequest: async (payload, helpers) => {
					try {
						this.messagesBeingHandled++
						await onMessageEventHandler(payload)
					} finally {
						this.messagesBeingHandled--
					}
				}
			}
		})
		this.graphileRunner.stop = _.once(this.graphileRunner.stop)
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
