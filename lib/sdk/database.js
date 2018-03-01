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

const jsonSchema = require('./json-schema')
const cardType = require('./card-type')
const CARDS = require('./cards')
const TABLE_CARD_TYPE = cardType.getSchema(CARDS.TYPE.TYPE).properties.type.constant

const ensureObjectMatchesSchema = (schema, object) => {
  const result = jsonSchema.validate(schema, object)
  if (!result.valid) {
    const error = new Error(`Invalid card: ${object.id}`)
    error.errors = result.errors
    throw error
  }
}

module.exports = class Database {
  constructor (backend) {
    this.backend = backend
  }

  async initialize () {
    await this.backend.connect()

    // Built-in tables
    await this.backend.createTable('cards')

    // Built-in cards
    await this.upsertCard(CARDS.TYPE.CARD)
    await this.upsertCard(CARDS.TYPE.TYPE)
  }

  async getSchema (type) {
    if (type === TABLE_CARD_TYPE) {
      return cardType.getSchema(CARDS.TYPE.TYPE)
    }

    const typeCard = await this.backend.getElement('cards', type)
    return cardType.getSchema(typeCard)
  }

  async insertCard (card) {
    ensureObjectMatchesSchema(CARDS.TYPE.CARD, card)
    const schema = await this.getSchema(card.type)
    if (!schema) {
      throw new Error(`Unknown type: ${card.type}`)
    }

    ensureObjectMatchesSchema(schema, card)
    await this.backend.insertElement('cards', card)
  }

  async updateCard (card) {
    ensureObjectMatchesSchema(CARDS.TYPE.CARD, card)
    const schema = await this.getSchema(card.type)
    if (!schema) {
      throw new Error(`Unknown type: ${card.type}`)
    }

    ensureObjectMatchesSchema(schema, card)
    await this.backend.updateElement('cards', card)
  }

  async upsertCard (card) {
    ensureObjectMatchesSchema(CARDS.TYPE.CARD, card)
    await this.backend.upsertCard('cards', card)
  }
}
