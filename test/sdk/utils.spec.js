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
const utils = require('../../lib/sdk/utils')
const CARDS = require('../../lib/sdk/cards')

const isCardMacro = (test, name, card, expected) => {
  test.deepEqual(utils.isCard(card).valid, expected)
}

isCardMacro.title = (title, name, card, expected) => {
  return `(${title}) isCard() should return ${expected} for ${name}`
}

_.each(_.map(fs.readdirSync(path.join(__dirname, 'cards')), (file) => {
  return {
    name: file,
    json: require(path.join(__dirname, 'cards', file))
  }
}), (testCase) => {
  ava.test('examples', isCardMacro, testCase.name, testCase.json.card, testCase.json.valid)
})

_.each(CARDS, (value, key) => {
  ava.test('built-in', isCardMacro, key, value, true)
})
