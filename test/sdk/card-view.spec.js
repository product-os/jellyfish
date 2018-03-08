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
const cardView = require('../../lib/sdk/card-view')
const CARDS = require('../../lib/sdk/cards')

ava.test('.getSchema() should return null given no card', (test) => {
  const schema = cardView.getSchema()
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null if the card is not a view', (test) => {
  const schema = cardView.getSchema(CARDS.core.card)
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return a schema given a view card', (test) => {
  const schema = cardView.getSchema({
    type: 'view',
    links: [],
    tags: [],
    active: true,
    data: {
      filters: [
        {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              minLength: 1
            }
          },
          required: [ 'foo' ]
        },
        {
          type: 'object',
          properties: {
            foo: {
              type: 'string',
              maxLength: 5
            }
          },
          required: [ 'foo' ]
        }
      ]
    }
  })

  test.deepEqual(schema, {
    type: 'object',
    properties: {
      foo: {
        type: 'string',
        minLength: 1,
        maxLength: 5
      }
    },
    required: [ 'foo' ]
  })
})
