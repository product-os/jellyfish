/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use jellyfish file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const EventEmitter = require('events').EventEmitter
const Bluebird = require('bluebird')
const time = require('./time')
const utils = require('./utils')
const jellyscript = require('../jellyscript')

const TYPE_ACTION_REQUEST = 'action-request'

const SCHEMA_ACTIVE_TRIGGERS = {
	type: 'object',
	properties: {
		active: {
			type: 'boolean',
			const: true
		},
		type: {
			type: 'string',
			const: 'triggered-action'
		},
		data: {
			type: 'object',
			additionalProperties: true
		}
	},
	required: [ 'active', 'type', 'data' ]
}

const SCHEMA_PENDING_REQUESTS = {
	type: 'object',
	required: [ 'id', 'active', 'type', 'data' ],
	properties: {
		id: {
			type: 'string'
		},
		active: {
			type: 'boolean',
			const: true
		},
		type: {
			type: 'string',
			const: TYPE_ACTION_REQUEST
		},
		data: {
			type: 'object',
			required: [ 'action', 'actor', 'target', 'executed', 'arguments' ],
			properties: {
				action: {
					type: 'string'
				},
				actor: {
					type: 'string'
				},
				target: {
					type: 'string'
				},
				executed: {
					type: 'boolean',
					const: false
				},
				arguments: {
					type: 'object',
					additionalProperties: true
				}
			}
		}
	}
}

const closeStream = (streams, name) => {
	if (!streams[name]) {
		return Bluebird.resolve()
	}

	return new Bluebird((resolve) => {
		streams[name].once('closed', () => {
			Reflect.deleteProperty(streams, name)
			resolve()
		})

		streams[name].close()
	})
}

module.exports = class Orchestrator extends EventEmitter {
	/**
   * @summary The Jellyfish Actions Orchestrator
   * @class
   * @public
   *
   * @param {Object} jellyfish - the jellyfish instance
   * @param {String} session - session
   *
   * @example
   * const orchestrator = new Orchestrator(jellyfish,
	 *   '4a962ad9-20b5-4dd8-a707-bf819593cc84')
   */
	constructor (jellyfish, session) {
		super()

		this.jellyfish = jellyfish
		this.session = session
		this.triggers = []
		this.streams = {}
	}

	/**
   * @summary Start the orchestrator
   * @function
   * @public
	 *
   * @example
   * const orchestrator = new Orchestrator(...)
	 * await orchestrator.start()
   */
	async start () {
		await this.stop()
		await this.refreshTriggers()

		this.actionRequestType =
			await this.jellyfish.getCardBySlug(this.session, TYPE_ACTION_REQUEST, {
				type: 'type'
			})

		if (!this.actionRequestType) {
			throw new Error(`No such card: ${TYPE_ACTION_REQUEST}`)
		}

		this.streams.triggers =
			await this.jellyfish.stream(this.session, SCHEMA_ACTIVE_TRIGGERS)
		this.streams.triggers.on('data', this.refreshTriggers.bind(this))
		this.streams.triggers.on('error', (error) => {
			this.emit('error', error)
		})

		this.streams.pendingRequests =
			await this.jellyfish.stream(this.session, SCHEMA_PENDING_REQUESTS)
		this.streams.pendingRequests.on('error', (error) => {
			this.emit('error', error)
		})

		this.streams.pendingRequests.on('data', (change) => {
			this.emit('request', change.after)
		})

		Bluebird.resolve(this.getPendingRequests()).each((request) => {
			this.emit('request', request)
		}).catch((error) => {
			this.emit('error', error)
		})
	}

	/**
   * @summary Stop the orchestrator
   * @function
   * @public
	 *
	 * @returns {Promise}
   *
   * @example
   * const orchestrator = new Orchestrator(...)
	 * await orchestrator.start()
	 * await orchestrator.stop()
   */
	async stop () {
		return Bluebird.all([
			closeStream(this.streams, 'triggers'),
			closeStream(this.streams, 'pendingRequests')
		])
	}

	/**
	 * @summary Get all triggered action cards in the system
	 * @function
	 * @public
	 *
	 * @returns {Object[]} triggered action cards
	 *
	 * @example
   * const orchestrator = new Orchestrator(...)
	 * const triggers = orchestrator.getTriggeredActionCards()
	 *
	 * for (const trigger of triggers) {
	 *   console.log(trigger.id)
	 * }
	 */
	getTriggeredActionCards () {
		return this.triggers
	}

	/**
	 * @summary Get all pending action request cards
	 * @function
	 * @public
	 *
	 * @returns {Object[]} action request cards
	 *
	 * @example
   * const orchestrator = new Orchestrator(...)
	 * const requests = await orchestrator.getPendingRequests()
	 *
	 * for (const request of requests) {
	 *   console.log(request.id)
	 * }
	 */
	getPendingRequests () {
		return this.jellyfish.query(this.session, SCHEMA_PENDING_REQUESTS)
	}

	/**
	 * @summary Create an action request
	 * @function
	 * @public
	 *
	 * @param {String} session - session
	 * @param {String} action - action slug
	 * @param {Object} options - options
	 * @param {String} options.targetId - target
	 * @param {String} options.actorId - actor
	 * @param {Object} options.arguments - arguments
	 * @returns {Object} action request card
	 *
	 * @example
   * const orchestrator = new Orchestrator(...)
	 *
	 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
	 * const request = await orchestrator.createRequest(session, 'action-create-card', {
	 *   targetId: 'd7ad2087-638c-4370-a292-684baeca16cc',
	 *   actorId: '9be06311-36e1-4fa1-8bc3-cd2c7a02da9a',
	 *   arguments: { ... }
	 * })
	 *
	 * console.log(request.id)
	 */
	async createRequest (session, action, options) {
		const actionCard = await this.jellyfish.getCardBySlug(session, action, {
			type: 'action',
			writeMode: true
		})

		if (!actionCard) {
			throw new Error(`You don't have permission to execute this action: ${action}`)
		}

		return this.jellyfish.insertCard(session, {
			type: TYPE_ACTION_REQUEST,
			active: true,
			links: [],
			tags: [],
			data: {
				action: actionCard.slug,

				// Anyone is free to create an action request
				// matching to anything they like. Whether they
				// can access these cards is something that must
				// be checked right before actually executing the
				// action, otherwise if all the checks are here,
				// then someone can circunvent them all by creating
				// a request directly on the core server, which
				// won't perform any checks.
				actor: options.actorId,
				target: options.targetId,

				timestamp: time.getCurrentTimestamp(),
				executed: false,
				arguments: jellyscript.evaluateObject(
					utils.getActionArgumentsSchema(actionCard),
					options.arguments
				).object
			}
		})
	}

	/**
	 * @summary Refresh the list of known trigger cards
	 * @function
	 * @private
	 *
	 * @example
   * const orchestrator = new Orchestrator(...)
	 * await orchestrator.refreshTriggers()
	 */
	async refreshTriggers () {
		this.triggers =
			await this.jellyfish.query(this.session, SCHEMA_ACTIVE_TRIGGERS)
	}
}
