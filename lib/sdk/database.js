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
const CARDS = require('./cards')

module.exports = class Database {
  constructor (backend, options) {
    this.backend = backend
    this.bucket = options.bucket
  }

  async initialize () {
    await this.backend.connect()

    // Built-in tables
    await this.backend.createTable(this.bucket)

    // Built-in cards

    // The "type" card is a building block for every card including
    // itself, therefore we insert it in a more "unsafe" fashion
    await this.backend.upsertElement(this.bucket, CARDS.TYPE.TYPE)

    for (const card of [
      CARDS.TYPE.CARD,
      CARDS.TYPE.USER,
      CARDS.USER.ADMIN,
      CARDS.EVENT.CREATE
    ]) {
      await this.insertCard(card, {
        override: true
      })
    }
  }

  async getSchema (type) {
    const typeCard = await this.backend.getElement(this.bucket, type)

    // Will already return null given no card
    return cardType.getSchema(typeCard)
  }

  async insertCard (card, options = {}) {
    _.defaults(options, {
      override: false
    })

    jsonSchema.validate(cardType.getSchema(CARDS.TYPE.CARD), card)

    const schema = await this.getSchema(card.type)
    if (!schema) {
      throw new Error(`Unknown type: ${card.type}`)
    }

    jsonSchema.validate(schema, card)

    if (options.override) {
      return this.backend.upsertElement(this.bucket, card)
    }

    return this.backend.insertElement(this.bucket, card)
  }
}
