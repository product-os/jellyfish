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

ava.test.beforeEach(async (test) => {
  test.context.backend = new Backend({
    host: process.env.TEST_DB_HOST,
    port: process.env.TEST_DB_PORT,
    database: `test_${randomstring.generate()}`
  })

  await test.context.backend.connect()
  await test.context.backend.reset()
})

ava.test.afterEach(async (test) => {
  await test.context.backend.disconnect()
})

ava.test('.getElement() should return null if the table does not exist', async (test) => {
  const result = await test.context.backend.getElement('foobarbaz', 'xxxxxxxxx')
  test.deepEqual(result, null)
})

ava.test('.getElement() should return null if the element is not present', async (test) => {
  await test.context.backend.createTable('test')
  const result = await test.context.backend.getElement('test', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
  test.deepEqual(result, null)
})

ava.test('.getElement() should fetch an element given its slug', async (test) => {
  await test.context.backend.createTable('test')
  const uuid = await test.context.backend.insertElement('test', {
    slug: 'example',
    test: 'foo'
  })

  const result = await test.context.backend.getElement('test', 'example')
  test.deepEqual(result, {
    id: uuid,
    slug: 'example',
    test: 'foo'
  })
})

ava.test('.createTable() should be able to create a table', async (test) => {
  test.false(await test.context.backend.hasTable('foobar'))
  await test.context.backend.createTable('foobar')
  test.true(await test.context.backend.hasTable('foobar'))
})

ava.test('.createTable() should ignore continuous attempts to create the same table', async (test) => {
  test.false(await test.context.backend.hasTable('foobar'))
  await test.context.backend.createTable('foobar')
  await test.context.backend.createTable('foobar')
  await test.context.backend.createTable('foobar')
  test.true(await test.context.backend.hasTable('foobar'))
})

ava.test('.insertElement() should insert a card without a slug nor an id', async (test) => {
  await test.context.backend.createTable('test')
  const uuid = await test.context.backend.insertElement('test', {
    test: 'foo'
  })

  const element = await test.context.backend.getElement('test', uuid)

  test.deepEqual(element, {
    id: uuid,
    test: 'foo'
  })
})

ava.test('.insertElement() should create multiple elements given same content and no id', async (test) => {
  await test.context.backend.createTable('test')

  const object = {
    test: 'foo'
  }

  const uuid1 = await test.context.backend.insertElement('test', object)
  const uuid2 = await test.context.backend.insertElement('test', object)
  const uuid3 = await test.context.backend.insertElement('test', object)

  test.not(uuid1, uuid2)
  test.not(uuid2, uuid3)
  test.not(uuid3, uuid1)

  const element1 = await test.context.backend.getElement('test', uuid1)
  const element2 = await test.context.backend.getElement('test', uuid2)
  const element3 = await test.context.backend.getElement('test', uuid3)

  test.deepEqual(element1, {
    id: uuid1,
    test: 'foo'
  })

  test.deepEqual(element2, {
    id: uuid2,
    test: 'foo'
  })

  test.deepEqual(element3, {
    id: uuid3,
    test: 'foo'
  })
})

ava.test('.insertElement() should insert a card with an id', async (test) => {
  await test.context.backend.createTable('test')
  const uuid = await test.context.backend.insertElement('test', {
    id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
    test: 'foo'
  })

  test.is(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

  const element = await test.context.backend.getElement('test', uuid)

  test.deepEqual(element, {
    id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
    test: 'foo'
  })
})

ava.test('.insertElement() should replace an element given an insertion to the same id', async (test) => {
  await test.context.backend.createTable('test')
  const uuid1 = await test.context.backend.insertElement('test', {
    test: 'foo',
    hello: 'world'
  })

  const uuid2 = await test.context.backend.insertElement('test', {
    id: uuid1,
    test: 'bar'
  })

  test.is(uuid1, uuid2)

  const element = await test.context.backend.getElement('test', uuid1)
  test.deepEqual(element, {
    id: uuid1,
    test: 'bar'
  })
})

ava.test('.insertElement() should insert a card with a slug', async (test) => {
  await test.context.backend.createTable('test')
  const uuid = await test.context.backend.insertElement('test', {
    slug: 'example',
    test: 'foo'
  })

  test.not(uuid, 'example')

  const element = await test.context.backend.getElement('test', uuid)

  test.deepEqual(element, {
    id: uuid,
    slug: 'example',
    test: 'foo'
  })
})

ava.test('.insertElement() should replace an element given the slug but no id', async (test) => {
  await test.context.backend.createTable('test')

  const uuid1 = await test.context.backend.insertElement('test', {
    slug: 'example',
    test: 'foo',
    hello: 'world'
  })

  const uuid2 = await test.context.backend.insertElement('test', {
    slug: 'example',
    test: 'bar'
  })

  test.is(uuid1, uuid2)

  const element = await test.context.backend.getElement('test', uuid1)

  test.deepEqual(element, {
    id: uuid1,
    slug: 'example',
    test: 'bar'
  })
})
