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
const jsonSchema = require('../../lib/sdk/json-schema')
const errors = require('../../lib/sdk/errors')

ava.test.beforeEach(async (test) => {
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
      const element = await test.context.database.getCard(card.slug)
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
  const element = await test.context.database.getCard('foobarbazqux')
  test.falsy(element)
  const schema = await test.context.database.getSchema('foobarbazqux')
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null given an known card that is not a type card ', async (test) => {
  const element = await test.context.database.getCard('admin')
  test.truthy(element)
  test.not(element.type, 'type')
  const schema = await test.context.database.getSchema('admin')
  test.deepEqual(schema, null)
})

ava.test('.insertCard() should throw an error if the element is not a valid card', async (test) => {
  await test.throws(test.context.database.insertCard({
    hello: 'world'
  }), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
  await test.throws(test.context.database.insertCard({
    slug: 'foo',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {}
  }), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the card type does not exist', async (test) => {
  const schema = await test.context.database.getSchema('foobarbazqux')
  test.deepEqual(schema, null)

  await test.throws(test.context.database.insertCard({
    type: 'foobarbazqux',
    active: true,
    links: [],
    tags: [],
    data: {}
  }), errors.JellyfishUnknownCardType)
})

ava.test('.insertCard() should be able to insert a card', async (test) => {
  const id = await test.context.database.insertCard({
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  })

  const element = await test.context.database.getCard(id)

  test.deepEqual(element, {
    id,
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  })
})

ava.test('.insertCard() should throw if the card already exists', async (test) => {
  const card = {
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  }

  await test.context.database.insertCard(card)
  await test.throws(test.context.database.insertCard(card), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertCard() should replace an element given override is true', async (test) => {
  const id1 = await test.context.database.insertCard({
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  })

  const id2 = await test.context.database.insertCard({
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.io'
    }
  }, {
    override: true
  })

  test.is(id1, id2)

  const element = await test.context.database.getCard(id1)

  test.deepEqual(element, {
    id: id1,
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.io'
    }
  })
})

ava.test('.getContext() should return a valid actor', async (test) => {
  const context = await test.context.database.getContext()
  test.true(jsonSchema.isValid(await test.context.database.getSchema('card'), context.actor))
  test.true(jsonSchema.isValid(await test.context.database.getSchema('user'), context.actor))
})

ava.test('.getContext() should return a valid timestamp', async (test) => {
  const context = await test.context.database.getContext()
  test.true(jsonSchema.isValid({
    type: 'string',
    format: 'date-time'
  }, context.timestamp))
})
