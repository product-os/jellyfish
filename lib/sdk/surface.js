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
const cardType = require('./card-type')
const cardAction = require('./card-action')
const cardView = require('./card-view')
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
  async getTimeline (id) {
    const card = await this.getCard(id)
    if (!card) {
      throw new errors.JellyfishNoElement(`Unknown id: ${id}`)
    }

    // TODO: If views could be parameterized, then
    // this function could call this.queryView() instead
    debug(`Getting the timeline of card ${id}`)
    return this.kernel.query({
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
    return this.kernel.query(cardView.getSchema(viewCard))
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
