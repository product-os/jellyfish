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
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const Kernel = require('../../lib/sdk/kernel')
const errors = require('../../lib/sdk/errors')
const CARDS = require('../../lib/sdk/cards')
const cardType = require('../../lib/sdk/card-type')
const jsonSchema = require('../../lib/sdk/json-schema')

ava.test.beforeEach(async (test) => {
  test.context.backend = new Backend({
    host: process.env.TEST_DB_HOST,
    port: process.env.TEST_DB_PORT,
    database: `test_${randomstring.generate()}`
  })

  await test.context.backend.connect()
  await test.context.backend.reset()

  test.context.table = 'cards'
  test.context.kernel = new Kernel(test.context.backend, {
    bucket: test.context.table
  })

  await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
  await test.context.backend.disconnect()
})

ava.test.skip('should be able to initialize the kernel multiple times without errors', async (test) => {
  test.notThrows(async () => {
    await test.context.kernel.initialize()
    await test.context.kernel.initialize()
    await test.context.kernel.initialize()
  })
})

ava.test('.insertCard() should throw an error if the element is not a valid card', async (test) => {
  await test.throws(test.context.kernel.insertCard({
    hello: 'world'
  }), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
  await test.throws(test.context.kernel.insertCard({
    slug: 'foo',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {}
  }), errors.JellyfishSchemaMismatch)
})

ava.test('.insertCard() should throw an error if the card type does not exist', async (test) => {
  await test.throws(test.context.kernel.insertCard({
    type: 'foobarbazqux',
    active: true,
    links: [],
    tags: [],
    data: {}
  }), errors.JellyfishUnknownCardType)
})

ava.test('.insertCard() should be able to insert a card', async (test) => {
  const id = await test.context.kernel.insertCard({
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  })

  const element = await test.context.backend.getElementById(test.context.table, id)

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

  await test.context.kernel.insertCard(card)
  await test.throws(test.context.kernel.insertCard(card), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertCard() should replace an element given override is true', async (test) => {
  const id1 = await test.context.kernel.insertCard({
    slug: 'johndoe',
    type: 'user',
    active: true,
    links: [],
    tags: [],
    data: {
      email: 'johndoe@example.com'
    }
  })

  const id2 = await test.context.kernel.insertCard({
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

  const element = await test.context.backend.getElementById(test.context.table, id1)

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
  const context = await test.context.kernel.getContext()
  test.true(jsonSchema.isValid(cardType.getSchema(CARDS.core.card), context.actor))
  test.true(jsonSchema.isValid(cardType.getSchema(CARDS.core.user), context.actor))
})

ava.test('.getContext() should return a valid timestamp', async (test) => {
  const context = await test.context.kernel.getContext()
  test.true(jsonSchema.isValid({
    type: 'string',
    format: 'date-time'
  }, context.timestamp))
})
