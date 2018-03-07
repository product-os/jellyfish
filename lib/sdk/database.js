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
const errors = require('./errors')
const CARDS = require('./cards')
const actions = require('./actions')
const time = require('./time')

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
    await this.backend.upsertElement(this.bucket, CARDS.CORE.type)

    for (const card of [
      CARDS.CORE.card,
      CARDS.CORE.action,
      CARDS.CORE.create,
      CARDS.CORE['action-update-property'],
      CARDS.CORE['action-create-card'],
      CARDS.CORE['action-create-event'],
      CARDS.CORE.event,

      CARDS.ESSENTIAL.update,
      CARDS.ESSENTIAL.delete,
      CARDS.ESSENTIAL.restore,
      CARDS.ESSENTIAL.user,
      CARDS.ESSENTIAL.admin,
      CARDS.ESSENTIAL['action-update-data-property'],
      CARDS.ESSENTIAL['action-update-header-property'],
      CARDS.ESSENTIAL['action-restore-card'],
      CARDS.ESSENTIAL['action-delete-card'],

      CARDS.CONTRIB['action-update-email']
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

    jsonSchema.validate(cardType.getSchema(CARDS.CORE.card), card)

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

  async getContext () {
    return {
      // Always use the admin user for now
      actor: await this.backend.getElement(this.bucket, 'admin'),
      timestamp: time.getCurrentTimestamp()
    }
  }

  async executeAction (actionCard, targetCard, args) {
    jsonSchema.validate(cardType.getSchema(CARDS.CORE.card), actionCard)
    jsonSchema.validate(cardType.getSchema(CARDS.CORE.card), targetCard)
    jsonSchema.validate(cardType.getSchema(CARDS.CORE.action), actionCard)
    jsonSchema.validate(cardAction.getFilterSchema(actionCard), targetCard)
    jsonSchema.validate(cardAction.getArgumentsSchema(actionCard), args)

    const context = await this.getContext()
    const compiledArguments = cardAction.compileOptions(actionCard, targetCard, context, args)
    const superActionSlug = cardAction.getSuperActionSlug(actionCard)

    if (superActionSlug) {
      const superAction = await this.backend.getElement(this.bucket, superActionSlug)
      if (!superAction) {
        throw new errors.JellyfishNoAction(`Unknown action: ${actionCard.extends}`)
      }

      jsonSchema.validate(cardType.getSchema(CARDS.CORE.action), superAction)
      return this.executeAction(superAction, targetCard, compiledArguments)
    }

    const actionFunction = actions[actionCard.slug]
    if (!actionFunction) {
      throw new errors.JellyfishNoAction(`Unknown action: ${actionCard.slug}`)
    }

    return actionFunction(this, targetCard, context, compiledArguments)
  }
}
