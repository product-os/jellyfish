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
const errors = require('../../../lib/sdk/errors')

ava.test('should replace an existing card and add an update event using a slug', async (test) => {
  const id1 = await test.context.surface.executeAction('action-create-card', 'user', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com',
        roles: []
      }
    }
  })

  const id2 = await test.context.surface.executeAction('action-update-card', id1, {
    properties: {
      data: {
        email: 'johndoe@gmail.com',
        roles: []
      }
    }
  })

  test.is(id1, id2)

  const card = await test.context.surface.getCard(id1)

  test.deepEqual(card, {
    id: id1,
    slug: 'johndoe',
    type: 'user',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com',
      roles: []
    }
  })

  const timeline = await test.context.surface.getTimeline(id1)
  test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

  test.deepEqual(timeline[1].data.payload, {
    slug: 'johndoe',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com',
      roles: []
    }
  })
})

ava.test('should replace an existing card and add an update event without using a slug', async (test) => {
  const id1 = await test.context.surface.executeAction('action-create-card', 'card', {
    properties: {
      data: {
        foo: 'bar'
      }
    }
  })

  const id2 = await test.context.surface.executeAction('action-update-card', id1, {
    properties: {
      data: {
        foo: 'baz'
      }
    }
  })

  test.is(id1, id2)

  const card = await test.context.surface.getCard(id1)

  test.deepEqual(card, {
    id: id1,
    type: 'card',
    tags: [],
    links: [],
    active: true,
    data: {
      foo: 'baz'
    }
  })

  const timeline = await test.context.surface.getTimeline(id1)
  test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

  test.deepEqual(timeline[1].data.payload, {
    tags: [],
    links: [],
    active: true,
    data: {
      foo: 'baz'
    }
  })
})

ava.test('should fail if the target does not exist', async (test) => {
  await test.throws(test.context.surface.executeAction('action-update-card', '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com',
        roles: []
      }
    }
  }), errors.JellyfishNoElement)
})

ava.test('should add an extra property to a card', async (test) => {
  const id1 = await test.context.surface.executeAction('action-create-card', 'user', {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com',
        roles: []
      }
    }
  })

  const id2 = await test.context.surface.executeAction('action-update-card', id1, {
    properties: {
      data: {
        email: 'johndoe@gmail.com',
        foobar: true,
        roles: []
      }
    }
  })

  test.is(id1, id2)

  const card = await test.context.surface.getCard(id1)

  test.deepEqual(card, {
    id: id1,
    slug: 'johndoe',
    type: 'user',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com',
      foobar: true,
      roles: []
    }
  })

  const timeline = await test.context.surface.getTimeline(id1)
  test.deepEqual(_.map(timeline, 'type'), [ 'create', 'update' ])

  test.deepEqual(timeline[1].data.payload, {
    slug: 'johndoe',
    tags: [],
    links: [],
    active: true,
    data: {
      email: 'johndoe@gmail.com',
      foobar: true,
      roles: []
    }
  })
})
