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
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const Database = require('../../lib/sdk/database')
const CARDS = require('../../lib/sdk/cards')

ava.test.beforeEach(async (test) => {
  // TODO: Stop exposing the backend instance once we
  // have a good way to query the database using JSON schema
  test.context.backend = new Backend({
    host: process.env.TEST_DB_HOST,
    port: process.env.TEST_DB_PORT,
    database: `test_${randomstring.generate()}`
  })

  await test.context.backend.connect()
  await test.context.backend.reset()

  test.context.table = 'cards'
  test.context.database = new Database(test.context.backend, {
    bucket: test.context.table
  })

  await test.context.database.initialize()
})

ava.test.afterEach(async (test) => {
  await test.context.backend.disconnect()
})

for (const category of _.keys(CARDS)) {
  for (const card of _.values(CARDS[category])) {
    ava.test(`should contain the ${category} card ${card.slug} by default`, async (test) => {
      const element = await test.context.backend.getElement(test.context.table, card.slug)
      test.deepEqual(CARDS[category][card.slug], _.omit(element, [ 'id' ]))
    })
  }
}

ava.test.skip('should be able to initialize the database multiple times without errors', async (test) => {
  test.notThrows(async () => {
    await test.context.database.initialize()
    await test.context.database.initialize()
    await test.context.database.initialize()
  })
})

ava.test('.getSchema() should return the schema of an existing type card', async (test) => {
  const schema = await test.context.database.getSchema(CARDS.core.type.slug)
  test.deepEqual(schema, CARDS.core.type.data.schema)
})

ava.test('.getSchema() should return null given an unknown type', async (test) => {
  const element = await test.context.backend.getElement(test.context.table, 'foobarbazqux')
  test.deepEqual(element, null)
  const schema = await test.context.database.getSchema('foobarbazqux')
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null given an known card that is not a type card ', async (test) => {
  const element = await test.context.backend.getElement(test.context.table, 'admin')
  test.truthy(element)
  test.not(element.type, 'type')
  const schema = await test.context.database.getSchema('admin')
  test.deepEqual(schema, null)
})
