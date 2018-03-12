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
const errors = require('./errors')
const CARDS = require('./cards')

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

    const typeCard = _.first(await this.query({
      type: 'object',
      properties: {

        // TODO: We should also check that the type equals "type".
        // That would be inefficient with the current JSON Schema
        // querying system, so lets avoid it for now.
        slug: {
          type: 'string',
          const: card.type
        }
      },
      required: [ 'slug' ],
      additionalProperties: true
    }))

    const schema = cardType.getSchema(typeCard)
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
}
