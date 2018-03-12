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
const Kernel = require('../../lib/sdk/kernel')
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
  test.context.kernel = new Kernel(test.context.backend, {
    bucket: test.context.table
  })

  await test.context.kernel.initialize()
})

ava.test.afterEach(async (test) => {
  await test.context.backend.disconnect()
})

for (const category of _.keys(CARDS)) {
  for (const card of _.values(CARDS[category])) {
    ava.test(`should contain the ${category} card ${card.slug} by default`, async (test) => {
      const element = await test.context.kernel.getCard(card.slug)
      test.deepEqual(CARDS[category][card.slug], _.omit(element, [ 'id' ]))
    })

    if (category !== 'core') {
      ava.test(`should contain a create event for the ${card.slug} card`, async (test) => {
        const element = await test.context.kernel.getCard(card.slug)
        const timeline = await test.context.kernel.getTimeline(element.id)
        test.is(timeline.length, 1)
        test.is(timeline[0].type, 'create')
      })
    }
  }
}

ava.test.skip('should be able to initialize the kernel multiple times without errors', async (test) => {
  test.notThrows(async () => {
    await test.context.kernel.initialize()
    await test.context.kernel.initialize()
    await test.context.kernel.initialize()
  })
})

ava.test('.getSchema() should return the schema of an existing type card', async (test) => {
  const schema = await test.context.kernel.getSchema(CARDS.core.type.slug)
  test.deepEqual(schema, CARDS.core.type.data.schema)
})

ava.test('.getSchema() should return null given an unknown type', async (test) => {
  const element = await test.context.kernel.getCard('foobarbazqux')
  test.falsy(element)
  const schema = await test.context.kernel.getSchema('foobarbazqux')
  test.deepEqual(schema, null)
})

ava.test('.getSchema() should return null given an known card that is not a type card ', async (test) => {
  const element = await test.context.kernel.getCard('admin')
  test.truthy(element)
  test.not(element.type, 'type')
  const schema = await test.context.kernel.getSchema('admin')
  test.deepEqual(schema, null)
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
  const schema = await test.context.kernel.getSchema('foobarbazqux')
  test.deepEqual(schema, null)

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

  const element = await test.context.kernel.getCard(id)

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

  const element = await test.context.kernel.getCard(id1)

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
  test.true(jsonSchema.isValid(await test.context.kernel.getSchema('card'), context.actor))
  test.true(jsonSchema.isValid(await test.context.kernel.getSchema('user'), context.actor))
})

ava.test('.getContext() should return a valid timestamp', async (test) => {
  const context = await test.context.kernel.getContext()
  test.true(jsonSchema.isValid({
    type: 'string',
    format: 'date-time'
  }, context.timestamp))
})

ava.test('.executeAction() should fail if the action id does not exist', async (test) => {
  await test.throws(test.context.kernel.executeAction('xxxxxxxxx', 'event', {
    properties: {
      slug: 'hello'
    }
  }), errors.JellyfishNoAction)
})

ava.test('.executeAction() should fail if there is no implementation', async (test) => {
  await test.context.kernel.insertCard({
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

  await test.throws(test.context.kernel.executeAction('action-demo', 'event', {}), errors.JellyfishNoAction)
})

ava.test('.getCard() should get a card by its id', async (test) => {
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

  const card = await test.context.kernel.getCard(id)

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

  const card = await test.context.kernel.getCard('johndoe')

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
  const card = await test.context.kernel.getCard('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  test.deepEqual(card, null)
})

ava.test('.getCard() should return null if the slug does not exist', async (test) => {
  const card = await test.context.kernel.getCard('foobarbazqux')
  test.deepEqual(card, null)
})

ava.test('.getTimeline() should return an empty list of the card has no timeline', async (test) => {
  const id = await test.context.kernel.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  test.deepEqual(await test.context.kernel.getTimeline(id), [])
})

ava.test('.getTimeline() should return the timeline ordered by time', async (test) => {
  const id = await test.context.kernel.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  const admin = await test.context.kernel.getCard('admin')
  test.truthy(admin)

  await test.context.kernel.insertCard({
    type: 'event',
    tags: [],
    links: [],
    active: true,
    data: {
      timestamp: '2018-03-09T19:57:40.963Z',
      target: id,
      actor: admin.id,
      payload: {}
    }
  })

  await test.context.kernel.insertCard({
    type: 'event',
    tags: [],
    links: [],
    active: true,
    data: {
      timestamp: '2018-04-09T19:57:40.963Z',
      target: id,
      actor: admin.id,
      payload: {}
    }
  })

  await test.context.kernel.insertCard({
    type: 'event',
    tags: [],
    links: [],
    active: true,
    data: {
      timestamp: '2018-02-09T19:57:40.963Z',
      target: id,
      actor: admin.id,
      payload: {}
    }
  })

  const timeline = await test.context.kernel.getTimeline(id)

  test.deepEqual(_.map(timeline, 'data.timestamp'), [
    '2018-02-09T19:57:40.963Z',
    '2018-03-09T19:57:40.963Z',
    '2018-04-09T19:57:40.963Z'
  ])
})

ava.test('.getTimeline() should fail if the id does not exist', async (test) => {
  const card = await test.context.kernel.getCard('4a962ad9-20b5-4dd8-a707-bf819593cc84')
  test.falsy(card)
  await test.throws(test.context.kernel.getTimeline('4a962ad9-20b5-4dd8-a707-bf819593cc84'), errors.JellyfishNoElement)
})

ava.test('.queryView() should throw if the view does not exist', async (test) => {
  await test.throws(test.context.kernel.queryView('xxxxxxxxxxxxxxxxxxx'), errors.JellyfishNoView)
})

ava.test('.queryView() should throw if the view is not of type view', async (test) => {
  const card = await test.context.kernel.getCard('card')
  test.truthy(card.id)
  await test.throws(test.context.kernel.queryView(card.id), errors.JellyfishSchemaMismatch)
})

ava.test('.queryView() should execute a view with one filter', async (test) => {
  const elementId = await test.context.kernel.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  const id = await test.context.kernel.insertCard({
    type: 'view',
    tags: [],
    links: [],
    active: true,
    data: {
      filters: [
        {
          name: 'foo',
          schema: {
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
        }
      ]
    }
  })

  const results = await test.context.kernel.queryView(id)
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

ava.test('.queryView() should execute a view with more than one filter', async (test) => {
  const elementId = await test.context.kernel.insertCard({
    type: 'card',
    tags: [ 'foo' ],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  await test.context.kernel.insertCard({
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      number: 1
    }
  })

  const id = await test.context.kernel.insertCard({
    type: 'view',
    tags: [],
    links: [],
    active: true,
    data: {
      filters: [
        {
          name: 'foo',
          schema: {
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
        },
        {
          name: 'bar',
          schema: {
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
        }
      ]
    }
  })

  const results = await test.context.kernel.queryView(id)
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
