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

ava.test('should replace an existing card and add an update event if upsert is true', async (test) => {
  const id1 = await test.context.database.executeAction('action-insert-card', 'user', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com'
      }
    },
    upsert: false
  })

  const id2 = await test.context.database.executeAction('action-insert-card', 'user', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@gmail.com'
      }
    },
    upsert: true
  })

  test.is(id1, id2)

  const card = await test.context.database.getCard(id1)

  test.deepEqual(card, {
    id: id1,
    slug: 'johndoe',
    type: 'user',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com'
    }
  })

  const timeline = await test.context.database.getTimeline(id1)
  test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

  test.deepEqual(timeline[1].data.payload, {
    slug: 'johndoe',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com'
    }
  })
})

ava.test('should create a card while upsert is true and add a create but not update event', async (test) => {
  const id = await test.context.database.executeAction('action-insert-card', 'user', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com'
      }
    },
    upsert: true
  })

  const card = await test.context.database.getCard(id)

  test.deepEqual(card, {
    id,
    slug: 'johndoe',
    type: 'user',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@example.com'
    }
  })

  const timeline = _.map(await test.context.database.getTimeline(id), 'type')
  test.deepEqual(timeline, [ 'create' ])
})
