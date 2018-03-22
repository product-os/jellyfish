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
const jsonSchema = require('./json-schema')
const cardAction = require('./card-action')
const errors = require('./errors')
const CARDS = require('./cards')

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
		this.errors = errors
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
			await this.kernel.executeInternalAction('action-upsert-card', card.type, {
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

	getSchema (card) {
		return this.kernel.getSchema(card)
	}

	async stream (schema, options) {
		return this.kernel.stream(schema, options)
	}

	async query (schema, options) {
		return this.kernel.query(schema, options)
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

		jsonSchema.validate(this.getSchema(await this.getCard('action')), actionCard)
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
