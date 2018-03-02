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

/**
 * @summary Get the schema of a card type
 * @function
 * @public
 *
 * @param {Object} card - card type
 * @returns {(Object|Null)} JSON Schema
 *
 * @example
 * const schema = cardType.getSchema({ ... })
 */
exports.getSchema = (card) => {
  return _.get(card, [ 'data', 'schema' ], null)
}

/**
 * @summary Check if a card matches a card type
 * @function
 * @public
 *
 * @param {Object} type - card type
 * @param {Object} card - card
 * @returns {Boolean} whether the card matches the card type
 *
 * @example
 * const myCardType = { ... }
 *
 * if (cardType.matches(myCardType, { ... })) {
 *   console.log('Match!')
 * }
 */
exports.matchesCard = (type, card) => {
  return jsonSchema.isValid(exports.getSchema(type), card)
}
