/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const uuid = require('uuid/v4')
const _ = require('lodash')
const Bluebird = require('bluebird')
const errors = require('../../../lib/core/errors')
const helpers = require('./helpers')

ava.beforeEach(helpers.backend.beforeEach)
ava.afterEach(helpers.backend.afterEach)

ava('.disconnect() should not throw if called multiple times', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.disconnect(test.context.context)
		await test.context.backend.disconnect(test.context.context)
		await test.context.backend.disconnect(test.context.context)
	})
})

ava('.disconnect() should gracefully close streams', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.stream(test.context.context, {
			type: 'object'
		})
		await test.context.backend.disconnect(test.context.context)
	})
})

ava('.getElementsById() should return an empty array given one non-existent element', async (test) => {
	const result = await test.context.backend.getElementsById(test.context.context, [ '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
		type: 'card'
	})

	test.deepEqual(result, [])
})

ava('.getElementsById() should return an found element', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result = await test.context.backend.getElementsById(test.context.context, [ element.id ], {
		type: 'card'
	})

	test.deepEqual(result, [ element ])
})

ava('.getElementsById() should omit not found elements', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card'
		})

	test.deepEqual(result, [ element ])
})

ava('.getElementsById() should omit elements on another table', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result = await test.context.backend.getElementsById(test.context.context, [ element.id ], {
		type: 'link'
	})

	test.deepEqual(result, [])
})

ava('.getElementsById() should get deterministic results', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result1 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card'
		})

	const result2 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card'
		})

	const result3 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card'
		})

	test.deepEqual(result1, result2)
	test.deepEqual(result2, result3)
})

ava('.getElementById() should return null if the element id is not present', async (test) => {
	const result = await test.context.backend.getElementById(test.context.context, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
		type: 'card'
	})

	test.deepEqual(result, null)
})

ava('.getElementById() should not break the cache if trying to query a valid slug with it', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result1 = await test.context.backend.getElementById(test.context.context, 'example', {
		type: 'card'
	})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementBySlug(test.context.context, 'example', {
		type: 'card'
	})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should not break the cache if trying to query a valid id with it', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result1 = await test.context.backend.getElementBySlug(test.context.context, element.id, {
		type: 'card'
	})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementById(test.context.context, element.id, {
		type: 'card'
	})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should return null if the element slug is not present', async (test) => {
	const result = await test.context.backend.getElementBySlug(test.context.context, 'foo', {
		type: 'card'
	})

	test.deepEqual(result, null)
})

ava('.getElementBySlug() should fetch an element given its slug', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	const result = await test.context.backend.getElementBySlug(test.context.context, 'example', {
		type: 'card'
	})

	test.deepEqual(result, element)
})

ava('.createTable() should be able to create a table', async (test) => {
	test.false(await test.context.backend.hasTable(test.context.context, 'foobar'))
	await test.context.backend.createTable(test.context.context, 'foobar')
	test.true(await test.context.backend.hasTable(test.context.context, 'foobar'))
})

ava('.createTable() should ignore continuous attempts to create the same table', async (test) => {
	test.false(await test.context.backend.hasTable(test.context.context, 'foobar'))
	await test.context.backend.createTable(test.context.context, 'foobar')
	await test.context.backend.createTable(test.context.context, 'foobar')
	await test.context.backend.createTable(test.context.context, 'foobar')
	test.true(await test.context.backend.hasTable(test.context.context, 'foobar'))
})

ava('.insertElement() should not insert an element without a slug nor an id to an existing table', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		test: 'foo',
		active: true
	}), errors.JellyfishDatabaseError)
})

ava('.insertElement() should not insert an element without a type', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: 'foo-bar-baz',
		active: true,
		test: 'foo'
	}), errors.JellyfishDatabaseError)
})

ava('.insertElement() should fail to insert an element with a very long slug', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: _.join(_.times(500, _.constant('x')), ''),
		type: 'card',
		active: true
	}), errors.JellyfishInvalidSlug)
})

ava('.insertElement() should insert an element with a non-existent slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		type: 'card'
	})

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card'
	})

	test.deepEqual(element, result)
})

ava('.insertElement() should not insert an element with a user defined id', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		active: true,
		slug: 'foo',
		type: 'card',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should insert an element with a non-existent id and slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		active: true,
		slug: 'example',
		type: 'card',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should not re-use the id when inserting an element with an existent id', async (test) => {
	const result1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		type: 'card',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement(test.context.context, {
		id: result1.id,
		slug: 'bar',
		active: true,
		type: 'card',
		foo: 'baz'
	})

	test.not(result1.id, result2.id)
})

ava('.insertElement() should fail to insert an element with an existent slug', async (test) => {
	await test.context.backend.insertElement(test.context.context, {
		slug: 'bar',
		active: true,
		type: 'card'
	})

	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: 'bar',
		active: true,
		type: 'card',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava('.insertElement() should not re-use ids when inserting an' +
				' element with an existent id but non-existent slug', async (test) => {
	const result1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		type: 'card',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement(test.context.context, {
		id: result1.id,
		slug: 'bar',
		active: true,
		type: 'card',
		foo: 'baz'
	})

	test.not(result2.id, result1.id)
})

ava('.insertElement() should fail to insert an element with a non-existent id but existent slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		type: 'card',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		active: true,
		slug: 'foo',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava('.upsertElement() should update linked cards when inserting a link', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {}
	})

	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card.slug}-is-attached-to-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card.id,
				type: card.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const updatedCard = await test.context.backend.getElementById(test.context.context, card.id, {
		type: 'message'
	})

	const updatedThread = await test.context.backend.getElementById(test.context.context, thread.id, {
		type: 'thread'
	})

	test.deepEqual(updatedCard.links, {
		'is attached to': [
			{
				$link: link.id,
				id: thread.id,
				slug: 'foo',
				type: 'thread'
			}
		]
	})

	test.deepEqual(updatedThread.links, {
		'has attached element': [
			{
				$link: link.id,
				id: card.id,
				slug: 'bar',
				type: 'message'
			}
		]
	})
})

ava('.upsertElement() should not be able to change a slug', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		test: 'foo',
		type: 'card',
		slug: 'foo',
		hello: 'world',
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: result1.id,
		type: 'card',
		slug: 'bar',
		hello: 'world',
		active: true
	})

	test.not(result1.id, result2.id)
	test.is(result1.slug, 'foo')
})

ava('.upsertElement() should not insert an element without a type', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		slug: 'foo-bar-baz',
		test: 'foo',
		active: true
	}), errors.JellyfishDatabaseError)
})

ava('.upsertElement() should insert a card with a slug', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	test.not(result.id, 'example')
	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card'
	})

	test.deepEqual(element, result)
})

ava('.upsertElement() should replace an element given the slug but no id', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'foo',
		hello: 'world',
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		test: 'bar',
		active: true
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(test.context.context, result1.id, {
		type: 'card'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should not let clients pick their own ids', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		active: true,
		slug: 'example',
		test: 'foo'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.upsertElement() should not be able to upsert without a slug nor an id', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		test: 'foo',
		active: true
	}), errors.JellyfishDatabaseError)
})

ava('.upsertElement() should not consider ids when inserting an element with an existing id' +
					', but matching the slug of another element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		active: true,
		type: 'card'
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		active: true,
		type: 'card',
		test: 'foo'
	})

	const result3 = await test.context.backend.upsertElement(test.context.context, {
		id: result2.id,
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	test.deepEqual(result3, {
		id: result1.id,
		active: true,
		type: 'card',
		slug: 'example',
		test: 'foo'
	})
})

ava('.upsertElement() should replace an element with an existing id and the slug of the same element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'example',
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: result1.id,
		type: 'card',
		slug: 'example',
		test: 'foo',
		active: true
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(test.context.context, result1.id, {
		type: 'card'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should ignore the id when' +
					' inserting an element with a non existing id and the slug of an element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card',
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		type: 'card',
		test: 'foo',
		active: true
	})

	test.not(result2.id, '9af7cf33-1a29-4f0c-a73b-f6a2b149850c')
	test.deepEqual(result2, {
		id: result1.id,
		active: true,
		slug: 'example',
		type: 'card',
		test: 'foo'
	})
})

ava('.upsertElement() should not insert an element with a non-matching id nor slug', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		test: 'foo',
		active: true
	}), errors.JellyfishDatabaseError)
})

ava('.query() should query the database using JSON schema', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'foo',
		test: 1,
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'test',
		slug: 'bar',
		test: 2,
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'baz',
		test: 3,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			active: {
				type: 'boolean'
			},
			slug: {
				type: 'string'
			},
			test: {
				type: 'number'
			},
			type: {
				type: 'string',
				pattern: '^example$'
			}
		},
		required: [ 'id', 'active', 'slug', 'test', 'type' ]
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [ result1, result2 ])
})

ava('.query() should escape malicious query keys', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.query(test.context.context, {
			type: 'object',
			properties: {
				'Robert\'); DROP TABLE cards; --': {
					type: 'object',
					properties: {
						'Robert\'); DROP TABLE cards; --': {
							type: 'string',
							const: 'foo'
						}
					}
				}
			},
			required: [ 'slug' ]
		})
	})
})

ava('.query() should escape malicious query values', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.query(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: 'Robert\'; DROP TABLE cards; --'
				}
			},
			required: [ 'slug' ]
		})
	})

	await test.notThrowsAsync(async () => {
		await test.context.backend.query(test.context.context, {
			type: 'object',
			properties: {
				foo: {
					type: 'string',
					const: 'Robert\'; DROP TABLE cards; --'
				}
			},
			required: [ 'slug' ]
		})
	})
})

ava('.query() should survive a deep schema', async (test) => {
	const generate = (times, seeds, index = 0) => {
		if (times === 0) {
			return {
				type: 'string',
				const: 'hello'
			}
		}

		const next = seeds[index % seeds.length]

		return {
			type: 'object',
			required: [ 'other', next ],
			properties: {
				other: {
					type: [ 'string', 'number' ]
				},
				[next]: generate(times - 1, seeds, index + 1)
			}
		}
	}

	const results1 = await test.context.backend.query(test.context.context, generate(100, [ 'foo', 'bar' ]))
	test.deepEqual(results1, [])

	const results2 = await test.context.backend.query(test.context.context, generate(150, [ 'foo', 'bar' ]))
	test.deepEqual(results2, [])
})

ava('.query() should give the same results when omitting additionalProperties and additionalProperties:false', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'foo',
		test: 1,
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'test',
		slug: 'bar',
		test: 2,
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'baz',
		test: 3,
		active: true
	})

	const results1 = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string'
			}
		},
		required: [ 'id', 'slug' ]
	})

	const results2 = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string'
			}
		},
		required: [ 'id', 'slug' ],
		additionalProperties: false
	})

	test.deepEqual(results1, results2)
})

ava('.query() should query an element by its id', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'foo',
		test: 1,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: result.id
			}
		},
		required: [ 'id' ],
		additionalProperties: true
	})

	test.deepEqual(results, [ result ])
})

ava('.query() should fail to query an element by its id', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'foo',
		test: 1,
		active: true
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
			}
		},
		required: [ 'id' ]
	})

	test.deepEqual(results, [])
})

ava('.query() should query an element by its slug', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'hello',
		test: 1,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'hello'
			}
		},
		required: [ 'slug' ],
		additionalProperties: true
	})

	test.deepEqual(results, [ result ])
})

ava('.query() should fail to query an element by its slug', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'hello',
		test: 1,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'xxxxxxxxx'
			}
		},
		required: [ 'slug' ]
	})

	test.deepEqual(results, [])
})

ava('.query() should not return unspecified properties', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		active: true,
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: 'hello'
			}
		},
		required: [ 'id', 'slug' ]
	})

	test.deepEqual(results, [
		{
			id: result.id,
			slug: 'hello'
		}
	])
})

ava('.query() should be able to provide a sort function', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'baz',
		test: 3,
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true
	})

	const result3 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'bar',
		test: 2,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		$$sort: 'input.a.test > input.b.test',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	})

	test.deepEqual(results, [ result1, result3, result2 ])
})

ava('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'bar',
		test: 2,
		active: true,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'baz',
		test: 3,
		active: true,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 2
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [ result1, result2 ])
})

ava('.query() should be able to skip the results', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'bar',
		test: 2,
		active: true,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	const result3 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'baz',
		test: 3,
		active: true,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		skip: 2
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [ result3 ])
})

ava('.query() should be able to skip the results of a one-element query', async (test) => {
	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: card.id
			}
		},
		required: [ 'id' ]
	}, {
		skip: 1
	})

	test.deepEqual(results, [])
})

ava('.query() should not skip the results of a one-element query if skip is set to zero', async (test) => {
	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: card.id
			}
		},
		required: [ 'id' ]
	}, {
		skip: 0
	})

	test.deepEqual(results, [
		{
			id: card.id
		}
	])
})

ava('.query() should be able to limit the results of a one-element query to 0', async (test) => {
	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: card.id
			}
		},
		required: [ 'id' ]
	}, {
		limit: 0
	})

	test.deepEqual(results, [])
})

ava('.query() should not omit the results of a one-element query if limit is set to one', async (test) => {
	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: card.id
			}
		},
		required: [ 'id' ]
	}, {
		limit: 1
	})

	test.deepEqual(results, [
		{
			id: card.id
		}
	])
})

ava('.query() should be able to limit and skip the results', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'foo',
		test: 1,
		active: true,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'bar',
		test: 2,
		active: true,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card',
		slug: 'baz',
		test: 3,
		active: true,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		skip: 1,
		limit: 1
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [ result2 ])
})

ava('.query() should be able to sort the query using a key', async (test) => {
	const card1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card',
		name: 'd',
		active: true,
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card',
		active: true,
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card',
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card',
		active: true,
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'name'
	})

	test.deepEqual(results, [ card2, card4, card3, card1 ])
})

ava('.query() should be able to sort the query in descending order', async (test) => {
	const card1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card',
		active: true,
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card',
		active: true,
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card',
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card',
		name: 'b',
		active: true,
		data: {}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'name',
		sortDir: 'desc'
	})

	test.deepEqual(results, [ card1, card3, card4, card2 ])
})

ava('.query() should be able to sort the query using an array of keys', async (test) => {
	const card1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card',
		active: true,
		data: {
			code: 'd'
		}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card',
		active: true,
		data: {
			code: 'a'
		}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card',
		active: true,
		data: {
			code: 'c'
		}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card',
		active: true,
		data: {
			code: 'b'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: [ 'data', 'code' ]
	})

	test.deepEqual(results, [ card2, card4, card3, card1 ])
})

ava('.query() should apply sort before skip', async (test) => {
	const card1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card',
		active: true,
		name: 'd',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card',
		active: true,
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card',
		active: true,
		name: 'c',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card',
		active: true,
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'name',
		skip: 2
	})

	test.deepEqual(results, [ card3, card1 ])
})

ava('.query() should apply sort before limit', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card',
		active: true,
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card',
		active: true,
		name: 'a',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card',
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card',
		active: true,
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'name',
		limit: 2
	})

	test.deepEqual(results, [ card2, card4 ])
})

ava('.query() should correctly honour top level additionalProperties: true', async (test) => {
	const user1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'user-johndoe',
		active: true,
		type: 'user'
	})
	const user2 = await test.context.backend.insertElement(test.context.context, {
		slug: 'user-janedoe',
		active: true,
		type: 'user'
	})
	const results1 = await test.context.backend.query(test.context.context, {
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		required: [ 'type' ],
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	const results2 = await test.context.backend.query(test.context.context, {
		type: 'object',
		anyOf: [
			{
				type: 'object',
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	const results3 = await test.context.backend.query(test.context.context, {
		type: 'object',
		anyOf: [
			{
				type: 'object',
				additionalProperties: false,
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	const results4 = await test.context.backend.query(test.context.context, {
		type: 'object',
		anyOf: [
			{
				type: 'object',
				additionalProperties: true,
				properties: {
					slug: {
						type: 'string'
					}
				},
				required: [ 'slug' ]
			}
		],
		required: [ 'type' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'user'
			}
		}
	})
	test.deepEqual(_.sortBy(results1, 'slug'), [
		{
			type: 'user'
		},
		{
			type: 'user'
		}
	])
	test.deepEqual(_.sortBy(results2, 'slug'), [
		{
			id: user2.id,
			active: true,
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: user1.id,
			active: true,
			slug: 'user-johndoe',
			type: 'user'
		}
	])
	test.deepEqual(_.sortBy(results3, 'slug'), [
		{
			slug: 'user-janedoe'
		},
		{
			slug: 'user-johndoe'
		}
	])
	test.deepEqual(_.sortBy(results4, 'slug'), [
		{
			type: 'user'
		},
		{
			type: 'user'
		}
	])
})

ava('.query() should resolve "limit" after resolving links', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {}
	})

	const thread2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'bar',
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'qux',
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	const linkCard = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card1.slug}-is-attached-to-${thread2.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: thread2.id,
				type: thread2.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		required: [ 'type' ],
		$$links: {
			'has attached element': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'thread'
			}
		}
	}, {
		limit: 1
	})

	test.deepEqual(results, [
		{
			id: thread2.id,
			active: true,
			type: thread2.type,
			slug: thread2.slug,
			links: {
				'has attached element': [
					Object.assign({}, card1, {
						links: {
							'is attached to': [
								{
									$link: linkCard.id,
									id: thread2.id,
									slug: thread2.slug,
									type: thread2.type
								}
							]
						}
					})
				]
			},
			data: {}
		}
	])
})

ava('.query() should be able to query using links', async (test) => {
	const thread1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {}
	})

	const thread2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'bar',
		active: true,
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'baz',
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'qux',
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card1.slug}-is-attached-to-${thread1.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: thread1.id,
				type: thread1.type
			}
		}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'tux',
		active: true,
		data: {
			payload: 'bar',
			count: 2
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card2.slug}-is-attached-to-${thread1.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card2.id,
				type: card2.type
			},
			to: {
				id: thread1.id,
				type: thread1.type
			}
		}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'fux',
		active: true,
		data: {
			payload: 'baz',
			count: 3
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card3.slug}-is-attached-to-${thread2.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card3.id,
				type: card3.type
			},
			to: {
				id: thread2.id,
				type: thread2.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$sort: 'input.a.data.count < input.b.data.count',
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'type' ],
				properties: {
					id: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'thread'
					}
				},
				additionalProperties: false
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				required: [ 'count', 'payload' ],
				properties: {
					count: {
						type: 'number'
					},
					payload: {
						type: 'string'
					}
				}
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'message',
			links: {
				'is attached to': [
					{
						id: thread1.id,
						type: 'thread'
					}
				]
			},
			data: {
				count: 1,
				payload: 'foo'
			}
		},
		{
			type: 'message',
			links: {
				'is attached to': [
					{
						id: thread1.id,
						type: 'thread'
					}
				]
			},
			data: {
				count: 2,
				payload: 'bar'
			}
		},
		{
			type: 'message',
			links: {
				'is attached to': [
					{
						id: thread2.id,
						type: 'thread'
					}
				]
			},
			data: {
				count: 3,
				payload: 'baz'
			}
		}
	])
})

ava('.query() should be able to query using links when getting an element by id', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		links: {},
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		links: {},
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		links: {},
		slug: `link-${message.slug}-has-attached-element-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: message.id,
				type: message.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$links: {
			'is attached to': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			links: {
				type: 'object',
				additionalProperties: true
			},
			id: {
				type: 'string',
				const: message.id
			},
			data: {
				type: 'object',
				additionalProperties: true
			},
			type: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: message.id,
			type: 'message',
			links: {
				'is attached to': [
					{
						active: true,
						slug: 'foo',
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						id: thread.id,
						links: {
							'has attached element': [
								{
									$link: link.id,
									id: message.id,
									slug: 'bar',
									type: 'message'
								}
							]
						},
						type: 'thread'
					}
				]
			},
			data: {
				payload: 'foo'
			}
		}
	])
})

ava('.query() should be able to query using links when getting an element by slug', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement(test.context.context, {
		slug: 'message-foobar',
		type: 'message',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${message.slug}-is-attached-to-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: message.id,
				type: message.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$links: {
			'is attached to': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			links: {
				type: 'object',
				additionalProperties: true
			},
			slug: {
				type: 'string',
				const: message.slug
			},
			data: {
				type: 'object',
				additionalProperties: true
			},
			type: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			slug: message.slug,
			type: 'message',
			links: {
				'is attached to': [
					{
						slug: 'foo',
						active: true,
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						id: thread.id,
						links: {
							'has attached element': [
								{
									$link: link.id,
									id: message.id,
									slug: 'message-foobar',
									type: 'message'
								}
							]
						},
						type: 'thread'
					}
				]
			},
			data: {
				payload: 'foo'
			}
		}
	])
})

ava('.query() should be able to query using links and an inverse name', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'mythread',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'foo',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const message2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${message1.slug}-is-attached-to-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: message1.id,
				type: message1.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const link2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${message2.slug}-is-attached-to-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: message2.id,
				type: message2.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$links: {
			'has attached element': {
				type: 'object',
				additionalProperties: true
			}
		},
		properties: {
			links: {
				type: 'object',
				additionalProperties: true
			},
			id: {
				type: 'string',
				const: thread.id
			},
			data: {
				type: 'object',
				additionalProperties: true
			},
			type: {
				type: 'string'
			}
		}
	})

	test.deepEqual(results, [
		{
			id: thread.id,
			type: 'thread',
			links: {
				'has attached element': [
					{
						active: true,
						slug: 'foo',
						id: message1.id,
						links: {
							'is attached to': [
								{
									$link: link1.id,
									id: thread.id,
									slug: 'mythread',
									type: 'thread'
								}
							]
						},
						type: 'message',
						data: {
							payload: 'foo'
						}
					},
					{
						active: true,
						slug: 'bar',
						id: message2.id,
						links: {
							'is attached to': [
								{
									$link: link2.id,
									id: thread.id,
									slug: 'mythread',
									type: 'thread'
								}
							]
						},
						type: 'message',
						data: {
							payload: 'foo'
						}
					}
				]
			},
			data: {
				description: 'lorem ipsum dolor sit amet'
			}
		}
	])
})

ava('.query() should omit a result if a link does not match', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread',
		slug: 'mythread',
		active: true,
		data: {}
	})

	const foo = await test.context.backend.upsertElement(test.context.context, {
		type: 'foo',
		slug: 'foo',
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card1.slug}-is-attached-to-${thread.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message',
		slug: 'baz',
		active: true,
		data: {
			payload: 'bar'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link',
		slug: `link-${card2.slug}-is-attached-to-${foo.slug}`,
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card2.id,
				type: card2.type
			},
			to: {
				id: foo.id,
				type: foo.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		required: [ 'type', 'links', 'data' ],
		$$links: {
			'is attached to': {
				type: 'object',
				required: [ 'id', 'type' ],
				properties: {
					id: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'thread'
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'message'
			},
			links: {
				type: 'object',
				additionalProperties: true
			},
			data: {
				type: 'object',
				required: [ 'payload' ],
				properties: {
					payload: {
						type: 'string'
					}
				}
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'message',
			links: {
				'is attached to': [
					{
						active: true,
						data: {},
						id: thread.id,
						links: {
							'has attached element': [
								{
									$link: link1.id,
									id: card1.id,
									slug: 'bar',
									type: 'message'
								}
							]
						},
						slug: 'mythread',
						type: 'thread'
					}
				]
			},
			data: {
				payload: 'foo'
			}
		}
	])
})

ava.cb('.stream() should report back new elements that match a certain type', (test) => {
	test.context.backend.stream(test.context.context, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				const: 'foo'
			},
			test: {
				type: 'number'
			}
		},
		required: [ 'type' ]
	}).then(async (emitter) => {
		emitter.on('data', (change) => {
			test.is(change.type, 'insert')
			test.is(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'foo',
				test: 1
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		await Bluebird.all([
			test.context.backend.insertElement(test.context.context, {
				type: 'foo',
				active: true,
				slug: 'foo',
				test: 1
			}),
			test.context.backend.insertElement(test.context.context, {
				type: 'bar',
				active: true,
				slug: 'bar',
				test: 3
			})
		])
	}).catch(test.end)
})

ava.cb('.stream() should report back changes to certain elements', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo',
		active: true,
		slug: 'hello',
		test: 1
	}).then(() => {
		return test.context.backend.insertElement(test.context.context, {
			type: 'bar',
			active: true,
			slug: 'qux',
			test: 1
		})
	}).then(() => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo'
				},
				test: {
					type: 'number'
				}
			},
			required: [ 'type' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.is(change.type, 'update')
			test.deepEqual(_.omit(change.before, [ 'id' ]), {
				slug: 'hello',
				type: 'foo',
				test: 1
			})

			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo',
				test: 2
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			active: true,
			type: 'foo',
			test: 2
		}).then(() => {
			return test.context.backend.upsertElement(test.context.context, {
				slug: 'qux',
				active: true,
				type: 'bar',
				test: 2
			})
		})
	}).catch(test.end)
})

ava.cb('.stream() should report back changes to large elements', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo',
		active: true,
		slug: 'hello',
		test: new Array(5000).join('foobar')
	}).then(() => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo'
				},
				test: {
					type: 'string'
				}
			},
			required: [ 'type' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			// Livefeeds are asynchronous and can pick up a change a
			// moment after the insertion, so there exist the
			// possibility that we get the initial insert event here,
			// and if so its fine to ignore, as it doesn't affect
			// the semantics of the tests.
			if (change.type === 'insert' &&
				_.isNull(change.before) &&
				_.isEqual(_.omit(change.after, [ 'id' ]), {
					slug: 'hello',
					type: 'foo',
					test: new Array(5000).join('foobar')
				})) {
				return
			}

			test.is(change.type, 'update')
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo',
				test: new Array(5000).join('bazbuzz')
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			active: true,
			type: 'foo',
			test: new Array(5000).join('bazbuzz')
		})
	}).catch(test.end)
})

ava.cb('.stream() should close without finding anything', (test) => {
	test.context.backend.stream(test.context.context, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'foobarbazqux'
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.on('error', test.end)
		emitter.on('closed', test.end)
		emitter.close()
	}).catch(test.end)
})

ava.cb('.stream() should set "before" to null if it previously did not match the schema', (test) => {
	test.context.backend.insertElement(test.context.context, {
		slug: 'foobarbaz',
		active: true,
		type: 'foo',
		test: '1'
	}).then((emitter) => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo'
				},
				test: {
					type: 'number'
				}
			},
			required: [ 'slug', 'type', 'test' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'foobarbaz',
				type: 'foo',
				test: 1
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.backend.upsertElement(test.context.context, {
			slug: 'foobarbaz',
			active: true,
			type: 'foo',
			test: 1
		})
	}).catch(test.end)
})

ava.cb('.stream() should filter the "before" section of a change', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo',
		active: true,
		slug: 'hello',
		test: 1,
		extra: true
	}).then(() => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo'
				},
				test: {
					type: 'number'
				}
			},
			required: [ 'type' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			// Livefeeds are asynchronous and can pick up a change a
			// moment after the insertion, so there exist the
			// possibility that we get the initial insert event here,
			// and if so its fine to ignore, as it doesn't affect
			// the semantics of the tests.
			if (change.type === 'insert' &&
				_.isNull(change.before) &&
				_.isEqual(_.omit(change.after, [ 'id' ]), {
					type: 'foo',
					slug: 'hello',
					test: 1
				})) {
				return
			}

			test.deepEqual(_.omit(change.before, [ 'id' ]), {
				slug: 'hello',
				type: 'foo',
				test: 1
			})

			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo',
				test: 2
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			active: true,
			type: 'foo',
			test: 2,
			extra: true
		})
	}).catch(test.end)
})

ava('.stream() should throw if the schema is invalid', async (test) => {
	await test.throwsAsync(test.context.backend.stream(test.context.context, {
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [ 'thread', 'thread' ]
			}
		}
	}))
})

ava('.upsertElement() should handle multiple parallel insertions on the same slug', async (test) => {
	for (const time of _.range(200)) {
		const object = {
			slug: 'foo-bar-baz',
			active: true,
			type: 'stress-test',
			time
		}

		try {
			await Bluebird.all([
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object)),
				test.context.backend.upsertElement(test.context.context, _.clone(object))
			])
		} catch (error) {
			test.true(error instanceof errors.JellyfishElementAlreadyExists)
		}

		const results = await test.context.backend.query(test.context.context, {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: object.type
				}
			}
		})

		test.is(results.length, 1)
	}
})

ava('.insertElement() should handle multiple parallel insertions on the same slug', async (test) => {
	for (const time of _.range(200)) {
		const object = {
			slug: 'foo-bar-baz',
			type: 'stress-test',
			active: true,
			time
		}

		try {
			await Bluebird.all([
				test.context.backend.insertElement(test.context.context, _.clone(object)),
				test.context.backend.insertElement(test.context.context, _.clone(object)),
				test.context.backend.insertElement(test.context.context, _.clone(object)),
				test.context.backend.insertElement(test.context.context, _.clone(object))
			])
		} catch (error) {
			test.true(error instanceof errors.JellyfishElementAlreadyExists)
		}

		const results = await test.context.backend.query(test.context.context, {
			type: 'object',
			required: [ 'type' ],
			properties: {
				type: {
					type: 'string',
					const: object.type
				}
			}
		})

		test.is(results.length, 1)
	}
})

ava('.lock() should be able to lock a non-locked slug', async (test) => {
	const result = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(result, 'locktest-1234')
})

ava('.lock() should not be able to lock a locked slug if the owner differs', async (test) => {
	const result1 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(result1, 'locktest-1234')

	const result2 = await test.context.backend.lock(
		'38642376-7a4a-4164-854f-0a16cc6da588', 'locktest-1234')
	test.falsy(result2)
})

ava('.lock() should be able to lock a locked slug if the owner is the same', async (test) => {
	const result1 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(result1, 'locktest-1234')

	const result2 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(result2, 'locktest-1234')
})

ava('.unlock() should not be able to unlock a non-locked slug', async (test) => {
	const result = await test.context.backend.unlock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.falsy(result)
})

ava('.unlock() should be able to unlock a locked slug by the same owner', async (test) => {
	const lockResult = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(lockResult, 'locktest-1234')

	const unlockResult = await test.context.backend.unlock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(unlockResult, 'locktest-1234')
})

ava('.unlock() should be able to let other owner take the same slug', async (test) => {
	const lockResult1 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(lockResult1, 'locktest-1234')

	const unlockResult = await test.context.backend.unlock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(unlockResult, 'locktest-1234')

	const lockResult2 = await test.context.backend.lock(
		'98853c0c-d055-4d25-a7be-682a2d5decc5', 'locktest-1234')
	test.is(lockResult2, 'locktest-1234')
})

ava('.unlock() should be able to let the same owner take the same slug', async (test) => {
	const lockResult1 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(lockResult1, 'locktest-1234')

	const unlockResult = await test.context.backend.unlock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(unlockResult, 'locktest-1234')

	const lockResult2 = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(lockResult2, 'locktest-1234')
})

ava('.unlock() should not be able to unlock a locked slug if the owner differs', async (test) => {
	const lockResult = await test.context.backend.lock(
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', 'locktest-1234')
	test.is(lockResult, 'locktest-1234')

	const unlockResult = await test.context.backend.unlock(
		'98853c0c-d055-4d25-a7be-682a2d5decc5', 'locktest-1234')
	test.falsy(unlockResult)
})

ava('.lock() only one owner can lock a slug at a time', async (test) => {
	for (const time of _.range(100)) {
		const slug = `locktest-${time}`
		const results = await Bluebird.all([
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug),
			test.context.backend.lock(uuid(), slug)
		])

		test.is(_.compact(results).length, 1)
	}
})
