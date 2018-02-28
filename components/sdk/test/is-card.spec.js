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
const sdk = require('../lib/index')

ava.test('should return true if its card', (test) => {
  const result = sdk.isCard({
    id: 'jviotti',
    type: 'jellyfish.person',
    access: {
      read: [],
      write: []
    },
    data: {
      tags: [],
      links: [],
      email: 'johndoe@example.com'
    }
  })

  test.true(result)
})
