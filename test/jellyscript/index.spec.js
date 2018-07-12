/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *		http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const jellyscript = require('../../lib/jellyscript')

ava.test('HASH: should pass if the password and salt matches', (test) => {
	const options = {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	}

	const hash = jellyscript.evaluate('HASH(input)', options)
	test.deepEqual(jellyscript.evaluate('HASH(input)', options), hash)
})

ava.test('HASH: should not pass if the password do not match', (test) => {
	const hash = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	})

	test.notDeepEqual(jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarqux',
			salt: 'user-foo'
		}
	}), hash)
})

ava.test('HASH: should not pass given a different salt', (test) => {
	const hash = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-foo'
		}
	})

	test.notDeepEqual(jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foobarbaz',
			salt: 'user-bar'
		}
	}), hash)
})

ava.test('.evaluate(): should return null if no input', (test) => {
	const result = jellyscript.evaluate('POW(input, 2)', {
		context: {},
		input: null
	})

	test.deepEqual(result, {
		watchers: [],
		value: null
	})
})

ava.test('.evaluate(): should resolve a number formula', (test) => {
	const result = jellyscript.evaluate('POW(input, 2)', {
		context: {
			number: 2
		},
		input: 2
	})

	test.deepEqual(result, {
		watchers: [],
		value: 4
	})
})

ava.test('.evaluate(): should resolve composite formulas', (test) => {
	const result = jellyscript.evaluate('MAX(POW(input, 2), POW(input, 3))', {
		context: {
			number: 2
		},
		input: 2
	})

	test.deepEqual(result, {
		watchers: [],
		value: 8
	})
})

ava.test('.evaluate(): should access other properties from the card', (test) => {
	const result = jellyscript.evaluate('ADD(this.value1, this.value2)', {
		context: {
			value1: 2,
			value2: 3
		},
		input: 0
	})

	test.deepEqual(result, {
		watchers: [],
		value: 5
	})
})

ava.test('.evaluate(): should evaluate a function', (test) => {
	const result = jellyscript.evaluate('FLIP(POW)', {
		context: {},
		input: 0
	})

	test.is(result.value(2, 2), 4)
	test.is(result.value(3, 2), 8)
})

ava.test('AGGREGATE: should ignore duplicates', (test) => {
	const result = jellyscript.evaluate('AGGREGATE(input, PARTIAL(FLIP(PROPERTY), "mentions"))', {
		context: {},
		input: [
			{
				mentions: [ 'foo', 'bar' ]
			},
			{
				mentions: [ 'bar', 'baz' ]
			},
			{
				mentions: [ 'baz', 'qux' ]
			}
		]
	})

	test.deepEqual(result, {
		watchers: [],
		value: [ 'foo', 'bar', 'baz', 'qux' ]
	})
})

ava.test('AGGREGATE: should aggregate a set of object properties', (test) => {
	const result = jellyscript.evaluate('AGGREGATE(input, PARTIAL(FLIP(PROPERTY), "mentions"))', {
		context: {},
		input: [
			{
				mentions: [ 'foo' ]
			},
			{
				mentions: [ 'bar' ]
			}
		]
	})

	test.deepEqual(result, {
		watchers: [],
		value: [ 'foo', 'bar' ]
	})
})

ava.test('REGEX_MATCH: should extract a set of mentions', (test) => {
	const result = jellyscript.evaluate('REGEX_MATCH(/(@[a-zA-Z0-9-]+)/g, input)', {
		context: {},
		input: 'Hello @johndoe, and @janedoe'
	})

	test.deepEqual(result, {
		watchers: [],
		value: [ '@johndoe', '@janedoe' ]
	})
})

ava.test('REGEX_MATCH: should consider duplicates', (test) => {
	const result = jellyscript.evaluate('REGEX_MATCH(/(@[a-zA-Z0-9-]+)/g, input)', {
		context: {},
		input: 'Hello @johndoe, and @janedoe, and @johndoe'
	})

	test.deepEqual(result, {
		watchers: [],
		value: [ '@johndoe', '@janedoe', '@johndoe' ]
	})
})

ava.test('AGGREGATE: should generate a watcher if aggregating $events', (test) => {
	const result = jellyscript.evaluate('AGGREGATE($events, "mentions")', {
		context: {
			type: 'thread',
			links: [],
			tags: [],
			active: true,
			data: {}
		},
		input: 'foo'
	})

	test.deepEqual(result.value, null)
	test.is(result.watchers.length, 1)

	test.deepEqual(result.watchers[0].target, [ 'data', 'target' ])
	test.is(result.watchers[0].type, 'AGGREGATE')
	test.deepEqual(result.watchers[0].arguments, [ 'mentions' ])

	test.deepEqual(result.watchers[0].filter, {
		type: 'object',
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target', 'payload' ],
				properties: {
					payload: {
						type: 'object'
					},
					target: {
						type: 'object',
						required: [ 'type' ],
						properties: {
							type: {
								type: 'string',
								const: 'thread'
							}
						}
					}
				}
			}
		}
	})
})

ava.test('.evaluateObject() should evaluate a number formula', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'number',
				$formula: 'POW(input, 2)'
			}
		}
	}, {
		foo: 3
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			foo: 9
		}
	})
})

ava.test('.evaluateObject() should evaluate a formula in a $ prefixed property', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			$foo: {
				type: 'number',
				$formula: 'POW(input, 2)'
			}
		}
	}, {
		$foo: 3
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			$foo: 9
		}
	})
})

ava.test('.evaluateObject() should evaluate a formula in a $$ prefixed property', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			$$foo: {
				type: 'number',
				$formula: 'POW(input, 2)'
			}
		}
	}, {
		$$foo: 3
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			$$foo: 9
		}
	})
})

ava.test('.evaluateObject() should ignore missing formulas', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'number',
				$formula: 'POW(input, 2)'
			}
		}
	}, {
		bar: 3
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			bar: 3
		}
	})
})

ava.test('.evaluateObject() should not ignore the zero number as missing', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'number',
				$formula: 'MAX(input, 2)'
			}
		}
	}, {
		foo: 0
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			foo: 2
		}
	})
})

ava.test('.evaluateObject() should evaluate nested formulas', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'object',
				properties: {
					bar: {
						type: 'object',
						properties: {
							baz: {
								type: 'number',
								$formula: 'POW(input, 2)'
							}
						}
					}
				}
			}
		}
	}, {
		foo: {
			bar: {
				baz: 2
			}
		}
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			foo: {
				bar: {
					baz: 4
				}
			}
		}
	})
})

ava.test('.evaluateObject() should evaluate a password hash', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				$formula: 'HASH({ string: input.password, salt: input.username })'
			}
		}
	}, {
		foo: {
			password: 'foo',
			username: 'user-johndoe'
		}
	})

	const hash = jellyscript.evaluate('HASH(input)', {
		input: {
			string: 'foo',
			salt: 'user-johndoe'
		}
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			foo: hash.value
		}
	})
})

ava.test('.evaluateObject() should not do anything if the schema has no formulas', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			foo: {
				type: 'string'
			},
			bar: {
				type: 'number'
			}
		}
	}, {
		foo: '1',
		bar: 2
	})

	test.deepEqual(result, {
		watchers: [],
		object: {
			foo: '1',
			bar: 2
		}
	})
})

ava.test('.evaluateObject() should report back watchers when aggregating events', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					mentions: {
						type: 'array',
						$formula: 'AGGREGATE($events, "mentions")'
					}
				}
			}
		}
	}, {
		type: 'thread',
		links: [],
		tags: [],
		active: true,
		data: {
			mentions: []
		}
	})

	test.deepEqual(result.object, {
		type: 'thread',
		links: [],
		tags: [],
		active: true,
		data: {
			mentions: []
		}
	})

	test.is(result.watchers.length, 1)

	test.deepEqual(result.watchers[0].filter, {
		type: 'object',
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target', 'payload' ],
				properties: {
					payload: {
						type: 'object'
					},
					target: {
						type: 'object',
						required: [ 'type' ],
						properties: {
							type: {
								type: 'string',
								const: 'thread'
							}
						}
					}
				}
			}
		}
	})

	test.is(result.watchers[0].type, 'AGGREGATE')
	test.deepEqual(result.watchers[0].sourceProperty, [ 'data', 'mentions' ])
	test.deepEqual(result.watchers[0].target, [ 'data', 'target' ])
	test.deepEqual(result.watchers[0].arguments, [ 'mentions' ])
})

ava.test('.evaluateObject() should report back watchers when aggregating events if the array is missing', async (test) => {
	const result = jellyscript.evaluateObject({
		type: 'object',
		properties: {
			data: {
				type: 'object',
				properties: {
					mentions: {
						type: 'array',
						$formula: 'AGGREGATE($events, "mentions")'
					}
				}
			}
		}
	}, {
		type: 'thread',
		links: [],
		tags: [],
		active: true,
		data: {}
	})

	test.is(result.watchers.length, 1)

	test.deepEqual(result.watchers[0].filter, {
		type: 'object',
		required: [ 'data' ],
		properties: {
			data: {
				type: 'object',
				required: [ 'target', 'payload' ],
				properties: {
					payload: {
						type: 'object'
					},
					target: {
						type: 'object',
						required: [ 'type' ],
						properties: {
							type: {
								type: 'string',
								const: 'thread'
							}
						}
					}
				}
			}
		}
	})

	test.is(result.watchers[0].type, 'AGGREGATE')
	test.deepEqual(result.watchers[0].sourceProperty, [ 'data', 'mentions' ])
	test.deepEqual(result.watchers[0].target, [ 'data', 'target' ])
	test.deepEqual(result.watchers[0].arguments, [ 'mentions' ])
})

ava.test('.getTypeTriggers() should report back watchers when aggregating events', async (test) => {
	const triggers = jellyscript.getTypeTriggers({
		slug: 'thread',
		type: 'type',
		active: true,
		links: [],
		tags: [],
		data: {
			schema: {
				type: 'object',
				properties: {
					data: {
						type: 'object',
						properties: {
							mentions: {
								type: 'array',
								$formula: 'AGGREGATE($events, "data.mentions")'
							}
						}
					}
				}
			}
		}
	})

	test.deepEqual(triggers, [
		{
			type: 'triggered-action',
			slug: 'triggered-action-thread-data-mentions',
			active: true,
			links: [],
			tags: [],
			data: {
				type: 'thread',
				action: 'action-set-add',
				target: {
					$eval: 'source.data.target'
				},
				arguments: {
					property: 'data.mentions',
					value: {
						$if: 'source.data.mentions',
						then: {
							$eval: 'source.data.mentions'
						},
						else: []
					}
				},
				filter: {
					type: 'object',
					required: [ 'data' ],
					properties: {
						data: {
							type: 'object',
							required: [ 'target', 'payload' ],
							properties: {
								payload: {
									type: 'object'
								},
								target: {
									type: 'object',
									required: [ 'type' ],
									properties: {
										type: {
											type: 'string',
											const: 'thread'
										}
									}
								}
							}
						}
					}
				}
			}
		}
	])
})
