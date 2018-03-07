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
const _ = require('lodash')
const cardType = require('../../lib/sdk/card-type')
const CARDS = require('../../lib/sdk/cards')

ava.test('.getSchema() should return null given no card', (test) => {
  const schema = cardType.getSchema()
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return the schema of a card type', (test) => {
  const schema = cardType.getSchema(CARDS.CORE.card)
  test.true(_.isPlainObject(schema))
  test.is(schema.type, 'object')
})

ava.test('.getSchema() should return null if the card is not a type card', (test) => {
  const schema = cardType.getSchema({
    type: 'foo',
    links: [],
    tags: [],
    data: {}
  })

  test.true(_.isNil(schema))
})

ava.test('.matchesCard() should return true given a card type and a matching card', (test) => {
  test.true(cardType.matchesCard(CARDS.CORE.type, CARDS.CORE.event))
})

ava.test('.matchesCard() should return false given a card type and a non-matching card', (test) => {
  test.false(cardType.matchesCard(CARDS.CORE.type, {
    type: 'foo',
    links: [],
    tags: [],
    data: {}
  }))
})

ava.test('.matchesCard() should return false given a non card type', (test) => {
  test.false(cardType.matchesCard({
    type: 'foo',
    links: [],
    tags: [],
    data: {}
  }, CARDS.CORE.event))
})
