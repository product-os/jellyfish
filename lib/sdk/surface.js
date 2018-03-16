/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
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

const _ = require('lodash')
const debug = require('debug')('jellyfish:surface')
const Bluebird = require('bluebird')
const EventEmitter = require('events').EventEmitter
const jsonSchema = require('./json-schema')
const cardType = require('./card-type')
const cardAction = require('./card-action')
const cardView = require('./card-view')
const errors = require('./errors')
const time = require('./time')
const utils = require('./utils')
const CARDS = require('./cards')
const ACTION_REQUEST_TYPE = CARDS.core['action-request'].slug

module.exports = class Surface {
	/**
   * @summary The Jellyfish Surface
   * @class
   * @public
   *
   * @param {Object} kernel - the kernel instance
   *
   * @example
   * const kernel = new Kernel(...)
   * const surface = new Surface(kernel)
   */
	constructor (kernel) {
		this.kernel = kernel
	}

	/**
   * @summary Initialize the database surface
   * @function
   * @public
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   */
	async initialize () {
		await this.kernel.initialize()

		for (const card of [
			CARDS.essential['action-restore-card'],
			CARDS.essential['action-delete-card'],
			CARDS.essential['view-non-executed-action-requests'],
			CARDS.contrib['action-update-email'],
			CARDS.contrib['view-all-views']
		]) {
			debug(`Upserting built-in card ${card.slug}`)
			await this.executeAction('action-upsert-card', card.type, {
				properties: _.omit(card, [ 'type' ])
			})
		}
	}

	/**
   * @summary Disconnect
   * @function
   * @public
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   * await surface.disconnect()
   */
	async disconnect () {
		await this.kernel.disconnect()
	}

	/**
   * @summary Get a card from the database
   * @function
   * @protected
   *
   * @param {String} id - card id
   * @param {Object} [options] - options
   * @param {Object} [options.inactive=false] - show inactive cards
   * @returns {Object} the card
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   *
   * const card = surface.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   * console.log(card.data)
   */
	async getCard (id, options) {
		return this.kernel.getCard(id, options)
	}

	/**
   * @summary Get the schema of a type card
   * @function
   * @public
   *
   * @param {String} type - type card slug
   * @returns {(Object|Null)} the type card schema
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   *
   * const schema = surface.getSchema('event')
   * if (schema) {
   *   console.log(schema)
   * }
   */
	async getSchema (type) {
		return cardType.getSchema(await this.getCard(type))
	}

	/**
   * @summary Get the timeline of a card
   * @function
   * @public
   *
   * @param {String} id - card id
   * @param {Object} [options] - options
   * @param {Object} [options.inactive=false] - show inactive cards
   * @returns {Object[]} timeline
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   *
   * const timeline = await surface.getTimeline('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   *
   * for (const event of timeline) {
   *   console.log(event.data.payload)
   * }
   */
	async getTimeline (id, options) {
		const card = await this.getCard(id, options)
		if (!card) {
			throw new errors.JellyfishNoElement(`Unknown id: ${id}`)
		}

		// TODO: If views could be parameterized, then
		// this function could call this.queryView() instead
		debug(`Getting the timeline of card ${id}`)
		return this.query({
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						target: {
							type: 'string',
							const: card.id
						}
					},
					required: [ 'target' ]
				}
			},
			additionalProperties: true,
			required: [ 'data' ]
		}, options)
	}

	async query (schema, options) {
		return this.kernel.query(schema, options)
	}

	async waitForMatch (schema) {
		const stream = await this.kernel.stream(schema, {
			inactive: true
		})

		let results = null

		stream.on('data', (change) => {
			results = change.after
			stream.close()
		})

		return new Bluebird((resolve, reject) => {
			stream.on('error', reject)
			stream.on('closed', () => {
				resolve(results)
			})
		})
	}

	/**
   * @summary Query the database using a view card
   * @function
   * @public
   *
   * @param {String} viewId - the view card id/slug
   * @returns {Object[]} results
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   *
   * const results = await surface.queryView('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   *
   * for (const card of results) {
   *   console.log(card)
   * }
   */
	async queryView (viewId) {
		const viewCard = await this.getCard(viewId)
		if (!viewCard) {
			throw new errors.JellyfishNoView(`Unknown view: ${viewId}`)
		}

		jsonSchema.validate(await this.getSchema('view'), viewCard)
		debug(`Querying using view ${viewId}`)
		return this.query(cardView.getSchema(viewCard))
	}

	async requestAction (actionId, targetId, args) {
		const context = await this.kernel.getContext()
		const target = await this.kernel.getCard(targetId)

		// TODO: Ensure the user has permission to request such action

		return this.kernel.executeInternalAction('action-create-card', ACTION_REQUEST_TYPE, {
			properties: {
				data: {
					action: actionId,
					actor: context.actor.id,
					target: target.id,
					timestamp: context.timestamp,
					executed: false,
					arguments: args
				}
			}
		})
	}

	async watchPendingActionRequests () {
		const schema = cardView.getSchema(await this.getCard('view-non-executed-action-requests'))
		const stream = await this.kernel.stream(schema)

		const emitter = new EventEmitter()
		emitter.close = stream.close
		utils.bridgeEvent(stream, emitter, 'error')
		utils.bridgeEvent(stream, emitter, 'closed')

		const onRequest = (element) => {
			emitter.emit('request', element)
		}

		stream.on('data', (change) => {
			onRequest(change.after)
		})

		Bluebird.resolve(this.query(schema))
			.each(onRequest)
			.catch((error) => {
				stream.close()
				emitter.emit('error', error)
			})

		return emitter
	}

	async isActionRequestExecuted (requestId) {
		const request = await this.getCard(requestId)
		return request.data.executed
	}

	async getActionRequestResults (requestId) {
		const request = await this.getCard(requestId)
		return request.data.result || null
	}

	async setActionRequestResults (requestId, results) {
		return this.kernel.executeInternalAction('action-update-card', requestId, {
			properties: {
				data: {
					executed: true,
					result: {
						timestamp: time.getCurrentTimestamp(),
						data: results
					}
				}
			}
		})
	}

	async waitForActionRequestResults (requestId) {
		if (await this.isActionRequestExecuted(requestId)) {
			return this.getActionRequestResults(requestId)
		}

		// TODO: This should be parameterized view
		const request = await this.waitForMatch({
			type: 'object',
			properties: {
				type: {
					type: 'string',
					const: ACTION_REQUEST_TYPE
				},
				id: {
					type: 'string',
					const: requestId
				},
				data: {
					type: 'object',
					properties: {
						executed: {
							type: 'boolean',
							const: true
						}
					},
					required: [ 'executed' ]
				}
			},
			required: [ 'type', 'id', 'data' ]
		})

		return request.data.result
	}

	/**
   * @summary Execute an action card
   * @function
   * @public
   *
   * @param {String} actionId - action id
   * @param {String} targetId - target id
   * @param {Object} args - action arguments
   * @returns {Any} action result
   *
   * @example
   * const surface = new Surface(kernel)
   * await surface.initialize()
   *
   * const id = surface.executeAction('action-create-card', 'user', {
   *   properties: {
   *     slug: 'johndoe',
   *     data: {
   *       email: 'johndoe@gmail.com'
   *     }
   *   }
   * })
   */
	async executeAction (actionId, targetId, args) {
		const actionCard = await this.getCard(actionId)
		if (!actionCard) {
			throw new errors.JellyfishNoAction(`Unknown action: ${actionId}`)
		}

		jsonSchema.validate(await this.getSchema('action'), actionCard)
		jsonSchema.validate(cardAction.getArgumentsSchema(actionCard), args)

		const compiledArguments = cardAction.compileOptions(actionCard, args)

		// Support for actions that extend other actions
		const superActionSlug = cardAction.getSuperActionSlug(actionCard)
		if (superActionSlug) {
			debug(`Executing super action ${superActionSlug}`)
			return this.executeAction(superActionSlug, targetId, compiledArguments)
		}

		return this.kernel.executeInternalAction(actionId, targetId, compiledArguments)
	}
}
