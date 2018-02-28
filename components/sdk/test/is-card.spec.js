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

const testCases = [
  {
    card: {
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
    },
    expected: {
      valid: true,
      errors: []
    }
  },
  {
    card: {
      id: 'xxxxxxxxxxxxxxxxx',
      type: 'jellyfish.thread',
      access: {
        read: [ 'foo' ],
        write: [ 'bar' ]
      },
      data: {
        tags: [ 'admin' ],
        links: [ 'yyyyyyyyy' ]
      }
    },
    expected: {
      valid: true,
      errors: []
    }
  },
  {
    card: {
      id: '....',
      type: 'jellyfish.thread',
      access: {
        read: [ 'foo' ],
        write: [ 'bar' ]
      },
      data: {
        tags: [ 'admin' ],
        links: [ 'yyyyyyyyy' ]
      }
    },
    expected: {
      valid: false,
      errors: [
        'data.id should match pattern "^[a-z0-9]+$"'
      ]
    }
  },
  {
    card: {
      id: 'jviotti',
      access: {
        read: [],
        write: []
      },
      data: {
        tags: [],
        links: [],
        email: 'johndoe@example.com'
      }
    },
    expected: {
      valid: false,
      errors: [
        'data should have required property \'type\''
      ]
    }
  }
]

testCases.forEach((testCase) => {
  ava.test(`should return ${testCase.expected.valid} for ${testCase.card.type} example`, (test) => {
    const result = sdk.isCard(testCase.card)
    test.deepEqual(result, testCase.expected)
  })
})
