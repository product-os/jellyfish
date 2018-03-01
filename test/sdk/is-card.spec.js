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

const ava = require('ava')
const path = require('path')
const fs = require('fs')
const sdk = require('../../lib/sdk')

const testCases = fs.readdirSync(path.join(__dirname, 'cards')).map((card) => {
  return {
    name: card,
    json: require(path.join(__dirname, 'cards', card))
  }
})

testCases.forEach((testCase) => {
  ava.test(`should return ${testCase.json.valid} for ${testCase.name} example`, (test) => {
    const result = sdk.isCard(testCase.json.card)
    test.deepEqual(result.valid, testCase.json.valid)
  })
})
