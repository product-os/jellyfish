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

'use strict'

const CARDS = require('./cards')
const cardType = require('./card-type')

/**
 * @summary Check if an object is a card
 * @function
 * @public
 *
 * @param {Object} object - object
 * @returns {Boolean} whether the object is a card
 *
 * @example
 * if (utils.isCard({ ... })) {
 *   console.log('This is a card!')
 * }
 */
exports.isCard = (object) => {
  return cardType.matchesCard(CARDS.TYPE.CARD, object)
}

/**
 * @summary Check if a string is a UUID
 * @function
 * @public
 *
 * @param {String} string - string
 * @returns {Boolean} whether the string is a uuid
 *
 * @example
 * if (utils.isUUID('4a962ad9-20b5-4dd8-a707-bf819593cc84')) {
 *   console.log('This is a uuid')
 * }
 */
exports.isUUID = (string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(string)
}
