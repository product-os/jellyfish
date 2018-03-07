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
const ava = require('ava')
const path = require('path')
const fs = require('fs')
const jsonSchema = require('../../lib/sdk/json-schema')
const cardType = require('../../lib/sdk/card-type')
const CARDS = require('../../lib/sdk/cards')

const isCardMacro = (test, type, name, card, expected) => {
  test.deepEqual(jsonSchema.isValid(cardType.getSchema(type), card), expected)
}

isCardMacro.title = (title, type, name, card, expected) => {
  return `(${title}) jsonSchema.valid() should return ${expected} for ${name} using type ${type.slug}`
}

_.each(_.map(fs.readdirSync(path.join(__dirname, 'cards')), (file) => {
  return {
    name: file,
    json: require(path.join(__dirname, 'cards', file))
  }
}), (testCase) => {
  ava.test('examples', isCardMacro, CARDS.CORE.card, testCase.name, testCase.json.card, testCase.json.valid)
})

_.each(CARDS, (cards, category) => {
  _.each(cards, (value, key) => {
    ava.test(category, isCardMacro, CARDS.CORE.card, key, value, true)
    const type = CARDS.CORE[value.type] || CARDS.ESSENTIAL[value.type] || CARDS.CONTRIB[value.type]
    ava.test(category, isCardMacro, type, key, value, true)
  })
})
