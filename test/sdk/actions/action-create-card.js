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

ava.test('should create a card', async (test) => {
  const action = await test.context.database.getCard('action-create-card')
  const type = await test.context.database.getCard('user')

  const id = await test.context.database.executeAction(action, type, {
    properties: {
      slug: 'johndoe',
      data: {
        email: 'johndoe@example.com'
      }
    }
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
