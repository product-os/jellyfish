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
const jsonSchema = require('./json-schema')
const cardType = require('./card-type')
const cardAction = require('./card-action')
const cardView = require('./card-view')
const errors = require('./errors')
const CARDS = require('./cards')
const actions = require('./actions')
const time = require('./time')

module.exports = class Database {
  /**
   * @summary The Jellyfish Database
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
   * const database = new Database(backend, {
   *   bucket: 'cards'
   * })
   */
  constructor (backend, options) {
    this.backend = backend
    this.bucket = options.bucket
  }

  /**
   * @summary Initialize the database
   * @function
   * @public
   *
   * @description
   * This makes sure the database is connected to the backend
   * and that the backend is populated with the things we need.
   *
   * @example
   * const database = new Database(backend, { ... })
   * await database.initialize()
   */
  async initialize () {
    await this.backend.connect()

    // Built-in tables
    await this.backend.createTable(this.bucket)

    // Built-in cards

    // The "type" card is a building block for every card including
    // itself, therefore we insert it in a more "unsafe" fashion
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
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const schema = database.getSchema('event')
   * if (schema) {
   *   console.log(schema)
   * }
   */
  async getSchema (type) {
    return cardType.getSchema(await this.getCard(type))
  }

  /**
   * @summary Insert a card to the database
   * @function
   * @protected
   *
   * @param {Object} card - card object
   * @param {Object} [options] - options
   * @param {Boolean} [options.override=false] - override existing card
   * @returns {String} the card id
   *
   * @example
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const id = database.insertCard({ ... })
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
   * @summary Get a card from the database
   * @function
   * @protected
   *
   * @param {String} id - card id
   * @returns {Object} the card
   *
   * @example
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const card = database.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   * console.log(card.data)
   */
  async getCard (id) {
    return this.backend.getElement(this.bucket, id)
  }

  async getTimeline (id) {
    const card = await this.getCard(id)
    if (!card) {
      throw new errors.JellyfishNoElement(`Unknown id: ${id}`)
    }

    // TODO: If views could be parameterized, then
    // this function could call this.query() instead
    return this.backend.querySchema(this.bucket, {
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
   * @summary Get the current database context
   * @function
   * @private
   *
   * @returns {Object} the database context
   *
   * @example
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const context = await database.getContext()
   */
  async getContext () {
    return {
      // Always use the admin user for now
      actor: await this.getCard('admin'),
      timestamp: time.getCurrentTimestamp()
    }
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
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const results = await database.query('4a962ad9-20b5-4dd8-a707-bf819593cc84')
   *
   * for (const card of results) {
   *   console.log(card)
   * }
   */
  async query (viewId) {
    const viewCard = await this.getCard(viewId)
    if (!viewCard) {
      throw new errors.JellyfishNoView(`Unknown view: ${viewId}`)
    }

    jsonSchema.validate(cardType.getSchema(CARDS.core.view), viewCard)
    return this.backend.querySchema(this.bucket, cardView.getSchema(viewCard))
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
   * const database = new Database(backend, { ... })
   * await database.initialize()
   *
   * const id = database.executeAction('action-create-card', 'user', {
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

    const cardSchema = cardType.getSchema(CARDS.core.card)
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
      return this.executeAction(superActionSlug, targetId, compiledArguments)
    }

    const actionFunction = actions[actionCard.slug]
    if (!actionFunction) {
      throw new errors.JellyfishNoAction(`Unknown action function: ${actionCard.slug}`)
    }

    return actionFunction(this, targetCard, context, compiledArguments)
  }
}
