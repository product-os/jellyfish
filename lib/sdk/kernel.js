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
const debug = require('debug')('jellyfish:kernel')
const jsonSchema = require('./json-schema')
const cardType = require('./card-type')
const cardAction = require('./card-action')
const cardView = require('./card-view')
const errors = require('./errors')
const CARDS = require('./cards')
const actions = require('./actions')
const time = require('./time')
const utils = require('./utils')

module.exports = class Kernel {
  /**
   * @summary The Jellyfish Kernel
   * @class
   * @public
   *
   * @param {Object} backend - the backend instance
   * @param {Object} options - options
   * @param {String} options.bucket - the cards bucket
   *
   * @example
   * const backend = new Backend({
   *   database: 'my-jellyfish',
   *   host: 'localhost',
   *   port: 28015,
   *   user: 'admin',
   *   password: 'secret'
   * })
   *
   * const kernel = new Kernel(backend, {
   *   bucket: 'cards'
   * })
   */
  constructor (backend, options) {
    this.backend = backend
    this.bucket = options.bucket
  }

  /**
   * @summary Initialize the kernel
   * @function
   * @public
   *
   * @description
   * This makes sure the kernel is connected to the backend
   * and that the backend is populated with the things we need.
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   */
  async initialize () {
    await this.backend.connect()

    // Built-in tables
    debug(`Creating bucket ${this.bucket}`)
    await this.backend.createTable(this.bucket)

    // Built-in cards

    // The "type" card is a building block for every card including
    // itself, therefore we insert it in a more "unsafe" fashion
    debug('Upserting type card')
    await this.backend.upsertElement(this.bucket, CARDS.core.type)

    for (const card of [
      CARDS.core.card,
      CARDS.core.action,
      CARDS.core.event,
      CARDS.core.view,
      CARDS.core.create,
      CARDS.core.update,
      CARDS.core['action-insert-card'],
      CARDS.core['action-update-property'],
      CARDS.core['action-create-event'],
      CARDS.core.user,
      CARDS.core.admin
    ]) {
      debug(`Upserting core card ${card.slug}`)
      await this.insertCard(card, {
        override: true
      })
    }

    for (const card of [
      CARDS.essential.delete,
      CARDS.essential.restore,
      CARDS.essential['action-create-card'],
      CARDS.essential['action-update-data-property'],
      CARDS.essential['action-update-header-property'],
      CARDS.essential['action-restore-card'],
      CARDS.essential['action-delete-card'],

      CARDS.contrib['action-update-email'],
      CARDS.contrib['view-all-views']
    ]) {
      debug(`Upserting built-in card ${card.slug}`)
      await this.executeAction('action-insert-card', card.type, {
        properties: _.omit(card, [ 'type' ]),
        upsert: true
      })
    }
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
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const schema = kernel.getSchema('event')
   * if (schema) {
   *   console.log(schema)
   * }
   */
  async getSchema (type) {
    return cardType.getSchema(await this.getCard(type))
  }

  /**
   * @summary Insert a card to the kernel
   * @function
   * @protected
   *
   * @param {Object} card - card object
   * @param {Object} [options] - options
   * @param {Boolean} [options.override=false] - override existing card
   * @returns {String} the card id
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const id = kernel.insertCard({ ... })
   * console.log(id)
   */
  async insertCard (card, options = {}) {
    _.defaults(options, {
      override: false
    })

    jsonSchema.validate(cardType.getSchema(CARDS.core.card), card)

    const schema = await this.getSchema(card.type)
    if (!schema) {
      throw new errors.JellyfishUnknownCardType(`Unknown type: ${card.type}`)
    }

    jsonSchema.validate(schema, card)

    if (options.override) {
      return this.backend.upsertElement(this.bucket, card)
    }

    return this.backend.insertElement(this.bucket, card)
  }

  /**
   * @summary Query the kernel
   * @function
   * @public
   *
   * @param {Object} schema - JSON Schema
   * @returns {Object[]} results
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const results = await kernel.query({
   *   type: 'object',
   *   properties: {
   *     slug: {
   *       type: 'string',
   *       const: 'foo'
   *     }
   *   },
   *   required: [ 'slug' ]
   * })
   */
  async query (schema) {
    debug('Querying using schema')

    // TODO: Add necessary permissions filters from the context
    return this.backend.querySchema(this.bucket, schema)
  }

  /**
   * @summary Get a card from the kernel
   * @function
   * @protected
   *
   * @param {String} id - card id
   * @returns {Object} the card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = kernel.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   * console.log(card.data)
   */
  async getCard (id) {
    debug(`Fetching card ${id}`)

    if (utils.isUUID(id)) {
      return _.first(await this.query({
        type: 'object',
        properties: {
          id: {
            type: 'string',
            const: id
          }
        },
        additionalProperties: true,
        required: [ 'id' ]
      }))
    }

    return _.first(await this.query({
      type: 'object',
      properties: {
        slug: {
          type: 'string',
          const: id
        }
      },
      additionalProperties: true,
      required: [ 'slug' ]
    }))
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
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const timeline = await kernel.getTimeline('4a962ad9-20b5-4dd8-a707-bf819593cc84')
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
    })
  }

  /**
   * @summary Get the current kernel context
   * @function
   * @private
   *
   * @returns {Object} the kernel context
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const context = await kernel.getContext()
   */
  async getContext () {
    debug('Getting the kernel context')
    return {
      // Always use the admin user for now
      actor: await this.getCard('admin'),
      timestamp: time.getCurrentTimestamp()
    }
  }

  /**
   * @summary Query the kernel using a view card
   * @function
   * @public
   *
   * @param {String} viewId - the view card id/slug
   * @returns {Object[]} results
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const results = await kernel.queryView('4a962ad9-20b5-4dd8-a707-bf819593cc84')
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
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const id = kernel.executeAction('action-create-card', 'user', {
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
    const targetCard = await this.getCard(targetId)

    if (!actionCard) {
      throw new errors.JellyfishNoAction(`Unknown action: ${actionId}`)
    }

    if (!targetCard) {
      throw new errors.JellyfishNoElement(`Unknown target: ${targetId}`)
    }

    const cardSchema = await this.getSchema('card')
    jsonSchema.validate(cardSchema, actionCard)
    jsonSchema.validate(cardSchema, targetCard)

    jsonSchema.validate(await this.getSchema('action'), actionCard)
    jsonSchema.validate(cardAction.getFilterSchema(actionCard), targetCard)
    jsonSchema.validate(cardAction.getArgumentsSchema(actionCard), args)

    const context = await this.getContext()
    const compiledArguments = cardAction.compileOptions(actionCard, targetCard, context, args)

    // Support for actions that extend other actions
    const superActionSlug = cardAction.getSuperActionSlug(actionCard)
    if (superActionSlug) {
      debug(`Executing super action ${superActionSlug}`)
      return this.executeAction(superActionSlug, targetId, compiledArguments)
    }

    const actionFunction = actions[actionCard.slug]
    if (!actionFunction) {
      throw new errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
    }

    debug(`Executing built-in action ${actionCard.slug}`)
    return actionFunction(this, targetCard, context, compiledArguments)
  }
}
