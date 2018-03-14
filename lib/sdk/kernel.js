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
const actions = require('./actions')
const errors = require('./errors')
const CARDS = require('./cards')
const utils = require('./utils')
const time = require('./time')

module.exports = class Kernel {
  /**
   * @summary The Jellyfish Kernel
   * @class
   * @public
   *
   * @param {Object} backend - the backend instance
   * @param {Object} options - options
   * @param {Object} options.buckets - buckets
   * @param {String} options.buckets.cards - the cards bucket
   * @param {String} options.buckets.requests - the requests bucket
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
   *   buckets: {
   *     cards: 'cards',
   *     requests: 'requests'
   *   }
   * })
   */
  constructor (backend, options) {
    this.backend = backend
    this.buckets = options.buckets
  }

  /**
   * @summary Disconnect
   * @function
   * @public
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   * await kernel.disconnect()
   */
  async disconnect () {
    await this.backend.disconnect()
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
    for (const bucket of _.values(this.buckets)) {
      debug(`Creating bucket ${bucket}`)
      await this.backend.createTable(bucket)
    }

    // Built-in cards

    // The "type" card is a building block for every card including
    // itself, therefore we insert it in a more "unsafe" fashion
    debug('Upserting type card')
    await this.backend.upsertElement(this.buckets.cards, CARDS.core.type)

    for (const card of [
      CARDS.core.card,
      CARDS.core.action,
      CARDS.core['action-request'],
      CARDS.core.event,
      CARDS.core.view,
      CARDS.core.create,
      CARDS.core.update,
      CARDS.core['action-insert-card'],
      CARDS.core['action-update-property'],
      CARDS.core['action-create-event'],
      CARDS.core['view-active'],
      CARDS.core.user,
      CARDS.core.admin
    ]) {
      debug(`Upserting core card ${card.slug}`)
      await this.insertCard(card, {
        override: true
      })
    }
  }

  /**
   * @summary Get a card by its id or slug
   * @function
   * @public
   *
   * @param {String} id - card id or slug
   * @param {Object} [options] - options
   * @param {Object} [options.inactive=false] - show inactive cards
   * @returns {(Object|Null)} card
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const card = kernel.getCard('foobar')
   *
   * if (card) {
   *   console.log(card)
   * }
   */
  async getCard (id, options) {
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
      }, options)) || null
    }

    return _.first(await this.query({
      type: 'object',
      properties: {

        // TODO: We should also check that the type equals "type".
        // That would be inefficient with the current JSON Schema
        // querying system, so lets avoid it for now.
        slug: {
          type: 'string',
          const: id
        }
      },
      required: [ 'slug' ],
      additionalProperties: true
    }, options)) || null
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

    const schema = cardType.getSchema(await this.getCard(card.type))
    if (!schema) {
      throw new errors.JellyfishUnknownCardType(`Unknown type: ${card.type}`)
    }

    jsonSchema.validate(schema, card)

    // We decided to store action requests in a
    // different table for performance reasons
    const bucket = card.type === CARDS.core['action-request'].slug
      ? this.buckets.requests
      : this.buckets.cards

    if (options.override) {
      return this.backend.upsertElement(bucket, card)
    }

    return this.backend.insertElement(bucket, card)
  }

  /**
   * @summary Query the kernel
   * @function
   * @public
   *
   * @param {Object} schema - JSON Schema
   * @param {Object} [options] - options
   * @param {Object} [options.inactive=false] - show inactive cards
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
  async query (schema, options = {}) {
    _.defaults(options, {
      inactive: false
    })

    debug('Querying using schema')
    const filters = [ schema ]

    if (!options.inactive) {
      debug('Adding active cards filter')
      filters.push(cardView.getSchema(CARDS.core['view-active']))
    }

    const mergedSchema = jsonSchema.merge(filters)
    const type = _.get(schema, [ 'properties', 'type', 'const' ])

    // A performance shortcut to avoid querying more than
    // one table if we know what the user is looking for.
    if (type) {
      if (type === CARDS.core['action-request'].slug) {
        return this.backend.querySchema(this.buckets.requests, mergedSchema)
      }

      return this.backend.querySchema(this.buckets.cards, mergedSchema)
    }

    return _.concat(
      await this.backend.querySchema(this.buckets.cards, mergedSchema),
      await this.backend.querySchema(this.buckets.requests, mergedSchema)
    )
  }

  /**
   * @summary Get the current execution context
   * @function
   * @private
   *
   * @returns {Object} the execution context
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const context = await kernel.getContext()
   */
  async getContext () {
    debug('Getting the database context')
    return {
      // Always use the admin user for now
      actor: await this.getCard('admin'),
      timestamp: time.getCurrentTimestamp()
    }
  }

  /**
   * @summary Execute an internal action
   * @function
   * @public
   *
   * @param {String} actionId - action card id
   * @param {String} targetId - target id
   * @param {Object} args - action arguments
   * @returns {Any} action result
   *
   * @example
   * const kernel = new Kernel(backend, { ... })
   * await kernel.initialize()
   *
   * const id = kernel.executeInternalAction('action-create-card', 'user', {
   *   properties: {
   *     slug: 'johndoe',
   *     data: {
   *       email: 'johndoe@gmail.com'
   *     }
   *   }
   * })
   */
  async executeInternalAction (actionId, targetId, args) {
    const actionCard = await this.getCard(actionId)
    const targetCard = await this.getCard(targetId, {

      // We must allow users to execute actions on inactive cards,
      // otherwise there is no way to restore them, or create
      // inactive cards.
      inactive: true

    })

    if (!actionCard) {
      throw new errors.JellyfishNoAction(`Unknown action: ${actionId}`)
    }

    if (!targetCard) {
      throw new errors.JellyfishNoElement(`Unknown target: ${targetId}`)
    }

    const cardSchema = cardType.getSchema(CARDS.core.card)
    jsonSchema.validate(cardSchema, actionCard)
    jsonSchema.validate(cardSchema, targetCard)

    jsonSchema.validate(cardType.getSchema(CARDS.core.action), actionCard)
    jsonSchema.validate(cardAction.getFilterSchema(actionCard), targetCard)
    jsonSchema.validate(cardAction.getArgumentsSchema(actionCard), args)

    const actionFunction = actions[actionCard.slug]
    if (!actionFunction) {
      throw new errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
    }

    debug(`Executing internal action ${actionCard.slug}`)
    const context = await this.getContext()
    return actionFunction(this, targetCard, context, args)
  }
}
