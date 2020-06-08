/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const uuid = require('../uuid')
const logger = require('../logger').getLogger(__filename)
const assert = require('../assert')
const errors = require('./errors')
const events = require('./events')
const CARDS = require('./cards')

const ACTION_MAX_DELAY = {
	'action-integration-discourse-mirror-event': 2,
	'action-integration-front-mirror-event': 2,
	'action-integration-github-mirror-event': 2,
	'action-integration-import-event': 2,
	'action-integration-outreach-mirror-event': 2
}

// `graphile-worker` supports prioritization, but based only on a fixed number
// where lower values have lower priority than higher ones. See
// https://github.com/graphile/worker/blob/master/sql/000003.sql#L71-L127.
// Using this scheme as-is could lead to starvation for lower-priority tasks.
// Instead, we encode a combination of a timestamp and a priority into a single
// number used as a priority to achieve a result similar to the `aging`
// starvation-avoidance strategy.
//
// Each action has a fixed maximum waiting time that defaults to 0. The fixed
// priority for that card is then the current timestamp + a random number of
// seconds between 1 and the maximum waiting time. This aims to achieve 3
// things:
//
// - Bursts of low-priority actions are spread out
// - Low-priority actions run if there are no higher-priority ones
// - All actions have a deadline, preventing starvation
//
// However, there are 3 problems with this approach:
//
// - Low-priority actions can be executed out of order (due to random jitter)
// - Low-priority actions can still saturate the queue since the deadline is
//   fixed
// - `priority` has to be a 32-bit number, so this scheme is succeptible to the
//   Y2k38 problem
const getRequestPriority = (request) => {
	const now = Math.floor(Date.now() / 1000)
	const maxDelay = ACTION_MAX_DELAY[request.data.action.split('@')[0]]
	const jitter = maxDelay ? Math.round(Math.random() * maxDelay) + 1 : 0

	return now + jitter
}

module.exports = class Producer {
	constructor (jellyfish, session) {
		this.jellyfish = jellyfish
		this.session = session
	}

	async initialize (context) {
		logger.info(context, 'Inserting essential cards')
		await Bluebird.map(Object.values(CARDS), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card)
		})
	}

	// FIXME this function exists solely for the purpose of allowing upstream code
	// to put stuff "in the queue" ( = the request table on db) and call worker.execute
	// right after. Fix upstream code by calling queue.enqueue and let the worker deal
	// with the request asynchronously. Once done, turn this function private or merge
	// it with `enqueue`
	async storeRequest (actor, session, options) {
		const id = await uuid.random()
		const slug = `action-request-${id}`

		logger.debug(options.context, 'Storing request', {
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

				// TODO: Require users to be explicit on the card version
			} : this.jellyfish.getCardBySlug(
				options.context, session, `${options.card}@latest`),

			action: this.jellyfish.getCardBySlug(
				options.context, session, options.action),
			session: this.jellyfish.getCardById(
				options.context, session, session)
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
			type: 'action-request@1.0.0',
			slug,
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: options.context,
				originator: options.originator,
				actor: cards.session.data.actor,
				action: `${cards.action.slug}@${cards.action.version}`,
				input: {
					id: cards.target.id
				},
				arguments: options.arguments
			}
		})
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
		const request = await this.storeRequest(actor, session, options)
		const priority = getRequestPriority(request)
		console.log(request.data.action, priority)

		logger.info(options.context, 'Enqueueing request', {
			actor,
			priority,
			request: {
				slug: request.slug,
				action: options.action,
				card: options.card
			}
		})

		await this.jellyfish.backend.connection.any({
			name: 'enqueue-action-request',
			text: 'SELECT graphile_worker.add_job(\'actionRequest\', $1, priority := $2);',
			values: [ request, priority ]
		})

		return request
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
			() => {
				return `Request not found: ${JSON.stringify(actionRequest, null, 2)}`
			})
		assert.INTERNAL(context, request.data.payload,
			errors.QueueInvalidRequest,
			() => {
				return `Execute event has no payload: ${JSON.stringify(request, null, 2)}`
			})

		return {
			error: request.data.payload.error,
			timestamp: request.data.payload.timestamp,
			data: request.data.payload.data
		}
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
}
