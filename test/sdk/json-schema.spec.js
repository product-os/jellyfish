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
const jsonSchema = require('../../lib/sdk/json-schema')

ava.test('should validate a matching object', (test) => {
  const result = jsonSchema.validate({
    type: 'object'
  }, {
    foo: 'bar'
  })

  test.deepEqual(result, {
    valid: true,
    errors: []
  })
})

ava.test('should report back a single error', (test) => {
  const result = jsonSchema.validate({
    type: 'object',
    properties: {
      foo: {
        type: 'number'
      }
    }
  }, {
    foo: 'bar'
  })

  test.deepEqual(result, {
    valid: false,
    errors: [
      'data.foo should be number'
    ]
  })
})

ava.test('should report back more than one error', (test) => {
  const result = jsonSchema.validate({
    type: 'object',
    properties: {
      foo: {
        type: 'number'
      },
      bar: {
        type: 'string'
      }
    },
    required: [ 'foo', 'bar' ]
  }, {
    foo: 'bar'
  })

  test.deepEqual(result, {
    valid: false,
    errors: [
      'data.foo should be number',
      'data should have required property \'bar\''
    ]
  })
})
