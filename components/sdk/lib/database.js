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
const SCHEMA_CARD = require('./schemas/card.json')
const SCHEMA_CARD_TYPE = require('./schemas/tables/type.json')
const TABLE_CARD_TYPE = SCHEMA_CARD_TYPE.properties.type.constant

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
    await this.backend.createTable(TABLE_CARD_TYPE)
    await this.backend.createTable('jellyfish.operator')
    await this.backend.createTable('jellyfish.action')
    await this.backend.createTable('jellyfish.event')
    await this.backend.createTable('jellyfish.filter')
    await this.backend.createTable('jellyfish.user')
    await this.backend.createTable('jellyfish.role')
  }

  async getSchema (type) {
    if (type === TABLE_CARD_TYPE) {
      return SCHEMA_CARD_TYPE
    }

    const typeCard = await this.backend.getElement(TABLE_CARD_TYPE, type)
    return _.get(typeCard, [ 'data', 'schema' ], null)
  }

  async insertCard (card) {
    ensureObjectMatchesSchema(SCHEMA_CARD, card)
    const schema = await this.getSchema(card.type)
    if (!schema) {
      throw new Error(`Unknown type: ${card.type}`)
    }

    ensureObjectMatchesSchema(schema, card)
    await this.backend.insertElement(card.type, card)

    if (card.type === TABLE_CARD_TYPE) {
      await this.backend.createTable(card.id)
    }
  }
}
