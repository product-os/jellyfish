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

    if (category !== 'core') {
      ava.test(`should contain a create event for the ${card.slug} card`, async (test) => {
        const element = await test.context.database.getCard(card.slug)
        const timeline = await test.context.database.getTimeline(element.id)
        test.is(timeline.length, 1)
        test.is(timeline[0].type, 'create')
      })
    }
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

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
  await test.throws(test.context.database.executeAction('xxxxxxxxx', 'event', {
    properties: {
      slug: 'hello'
    }
  }), errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
  await test.context.database.insertCard({
    slug: 'action-demo',
    type: 'action',
    tags: [],
    links: [],
    active: true,
    data: {
      arguments: {},
      options: {
        foo: 'bar'
      }
    }
  })

  await test.throws(test.context.database.executeAction('action-demo', 'event', {}), errors.JellyfishNoAction)
})

ava.test('.getCard() should get a card by its id', async (test) => {
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

  const card = await test.context.database.getCard(id)

  test.deepEqual(card, {
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

ava.test('.getCard() should get a card by its slug', async (test) => {
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

  const card = await test.context.database.getCard('johndoe')

  test.deepEqual(card, {
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

ava.test('.getCard() should return null if the id does not exist', async (test) => {
  const card = await test.context.database.getCard('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  test.deepEqual(card, null)
})

ava.test('.getCard() should return null if the slug does not exist', async (test) => {
  const card = await test.context.database.getCard('foobarbazqux')
  test.deepEqual(card, null)
})

ava.test('.query() should throw if the view does not exist', async (test) => {
  await test.throws(test.context.database.query('xxxxxxxxxxxxxxxxxxx'), errors.JellyfishNoView)
})

ava.test('.query() should throw if the view is not of type view', async (test) => {
  const card = await test.context.database.getCard('card')
  test.truthy(card.id)
  await test.throws(test.context.database.query(card.id), errors.JellyfishSchemaMismatch)
})

ava.test('.query() should execute a view with one filter', async (test) => {
  const elementId = await test.context.database.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  const id = await test.context.database.insertCard({
    type: 'view',
    tags: [],
    links: [],
    active: true,
    data: {
      filters: [
        {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                number: {
                  type: 'number',
                  const: 1
                }
              },
              required: [ 'number' ]
            }
          },
          required: [ 'data' ]
        }
      ]
    }
  })

  const results = await test.context.database.query(id)
  test.deepEqual(results, [
    {
      id: elementId,
      type: 'card',
      tags: [],
      links: [],
      active: true,
      data: {
        number: 1
      }
    }
  ])
})

ava.test('.query() should execute a view with more than one filter', async (test) => {
  const elementId = await test.context.database.insertCard({
    type: 'card',
    tags: [ 'foo' ],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  await test.context.database.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  const id = await test.context.database.insertCard({
    type: 'view',
    tags: [],
    links: [],
    active: true,
    data: {
      filters: [
        {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                number: {
                  type: 'number',
                  const: 1
                }
              },
              required: [ 'number' ]
            }
          },
          required: [ 'data' ]
        },
        {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              contains: {
                type: 'string',
                const: 'foo'
              }
            }
          },
          required: [ 'tags' ]
        }
      ]
    }
  })

  const results = await test.context.database.query(id)
  test.deepEqual(results, [
    {
      id: elementId,
      type: 'card',
      tags: [ 'foo' ],
      links: [],
      active: true,
      data: {
        number: 1
      }
    }
  ])
})
