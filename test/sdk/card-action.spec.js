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
const cardAction = require('../../lib/sdk/card-action')
const CARDS = require('../../lib/sdk/cards')

ava.test('.getFilterSchema() should return a wildcard schema given no card', (test) => {
  const schema = cardAction.getFilterSchema()
  test.deepEqual(schema, {
    type: 'object'
  })
})

ava.test('.getFilterSchema() should return the filter schema of a card type', (test) => {
  const schema = cardAction.getFilterSchema(CARDS.core['action-create-card'])
  test.true(_.isPlainObject(schema))
  test.deepEqual(schema, CARDS.core['action-create-card'].data.filter)
})

ava.test('.getArgumentsSchema() should return a schema out of a single argument definition', (test) => {
  const schema = cardAction.getArgumentsSchema({
    data: {
      arguments: {
        foo: {
          type: 'number'
        }
      }
    }
  })

  test.deepEqual(schema, {
    type: 'object',
    additionalProperties: false,
    required: [ 'foo' ],
    properties: {
      foo: {
        type: 'number'
      }
    }
  })
})

ava.test('.getArgumentsSchema() should return a schema out of multiple arguments definition', (test) => {
  const schema = cardAction.getArgumentsSchema({
    data: {
      arguments: {
        foo: {
          type: 'number'
        },
        bar: {
          type: 'string'
        }
      }
    }
  })

  test.deepEqual(schema, {
    type: 'object',
    additionalProperties: false,
    required: [ 'foo', 'bar' ],
    properties: {
      foo: {
        type: 'number'
      },
      bar: {
        type: 'string'
      }
    }
  })
})

ava.test('.getArgumentsSchema() should return a wildcard schema if no arguments', (test) => {
  const schema = cardAction.getArgumentsSchema({
    data: {
      arguments: {}
    }
  })

  test.deepEqual(schema, {
    type: 'object'
  })
})

ava.test('.compileOptions() should compile options using no interpolation', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {},
      options: {
        foo: 'bar',
        bar: 'baz'
      }
    }
  }, {}, {}, {})

  test.deepEqual(options, {
    foo: 'bar',
    bar: 'baz'
  })
})

ava.test('.compileOptions() should compile options using arguments interpolation', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {
        foo: {
          type: 'number'
        }
      },
      options: {
        bar: '{{arguments.foo}}'
      }
    }
  }, CARDS.core.action, {}, {
    foo: 5
  })

  test.deepEqual(options, {
    bar: 5
  })
})

ava.test('.compileOptions() should compile options using card interpolation', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {},
      options: {
        bar: '{{card.type}}'
      }
    }
  }, CARDS.core.action, {}, {})

  test.deepEqual(options, {
    bar: 'type'
  })
})

ava.test('.compileOptions() should compile options using context interpolation', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {},
      options: {
        bar: '{{context.actor.id}}'
      }
    }
  }, CARDS.core.action, {
    actor: {
      id: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
    }
  }, {})

  test.deepEqual(options, {
    bar: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
  })
})

ava.test('.compileOptions() should compile an object argument', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {
        foo: {
          type: 'object'
        }
      },
      options: {
        bar: '{{arguments.foo}}'
      }
    }
  }, CARDS.core.action, {}, {
    foo: {
      bar: 'baz'
    }
  })

  test.deepEqual(options, {
    bar: {
      bar: 'baz'
    }
  })
})

ava.test('.compileOptions() should compile a boolean argument', (test) => {
  const options = cardAction.compileOptions({
    data: {
      arguments: {
        foo: {
          type: 'boolean'
        }
      },
      options: {
        bar: '{{arguments.foo}}'
      }
    }
  }, CARDS.core.action, {}, {
    foo: true
  })

  test.deepEqual(options, {
    bar: true
  })
})

ava.test('.getSuperActionSlug() should return null if no super action', (test) => {
  const superAction = cardAction.getSuperActionSlug({
    data: {
      arguments: {
        foo: {
          type: 'object'
        }
      },
      options: {
        bar: '{{arguments.foo}}'
      }
    }
  })

  test.deepEqual(superAction, null)
})

ava.test('.getSuperActionSlug() should return the super action slug', (test) => {
  const superAction = cardAction.getSuperActionSlug({
    data: {
      extends: 'action-foo-bar',
      arguments: {
        foo: {
          type: 'object'
        }
      },
      options: {
        bar: '{{arguments.foo}}'
      }
    }
  })

  test.deepEqual(superAction, 'action-foo-bar')
})
