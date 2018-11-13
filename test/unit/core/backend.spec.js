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
const Bluebird = require('bluebird')
const errors = require('../../../lib/core/errors')
const helpers = require('./helpers')

ava.test.beforeEach(helpers.backend.beforeEach)
ava.test.afterEach(helpers.backend.afterEach)

ava.test('.disconnect() should not throw if called multiple times', async (test) => {
	test.notThrows(async () => {
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
	})
})

ava.test('.getElementById() should return null if the element id is not present', async (test) => {
	await test.context.backend.createTable('test')
	const result = await test.context.backend.getElementById('test', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.deepEqual(result, null)
})

ava.test('.getElementById() should not break the cache if trying to query a valid slug with it', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'foo'
	})

	const result1 = await test.context.backend.getElementById('example')
	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementBySlug('example')
	test.deepEqual(result2, element)
})

ava.test('.getElementBySlug() should not break the cache if trying to query a valid id with it', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'foo'
	})

	const result1 = await test.context.backend.getElementBySlug(element.id)
	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementById(element.id)
	test.deepEqual(result2, element)
})

ava.test('.getElementBySlug() should return null if the element slug is not present', async (test) => {
	const result = await test.context.backend.getElementBySlug('foo')
	test.deepEqual(result, null)
})

ava.test('.getElementBySlug() should fetch an element given its slug', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'foo'
	})

	const result = await test.context.backend.getElementBySlug('example')
	test.deepEqual(result, element)
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

ava.test('.insertElement() should insert an element without a slug nor an id to an existing table', async (test) => {
	const result = await test.context.backend.insertElement({
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.insertElement() should insert an element with a non-existent slug', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.insertElement() should insert an element with a non-existent id', async (test) => {
	const result = await test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		foo: 'bar'
	})

	test.is(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.insertElement() should insert an element with a non-existent id and slug', async (test) => {
	const result = await test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		foo: 'bar'
	})

	test.is(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.insertElement() should not be able to set any links', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		type: 'card',
		links: {
			foo: 'bar'
		}
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element.links, {})
})

ava.test('.insertElement() should fail to insert an element with an existent id', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		foo: 'bar'
	})

	await test.throws(test.context.backend.insertElement({
		id: result.id,
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with an existent slug', async (test) => {
	await test.context.backend.insertElement({
		slug: 'bar'
	})

	await test.throws(test.context.backend.insertElement({
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with an existent id but non-existent slug', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		foo: 'bar'
	})

	await test.throws(test.context.backend.insertElement({
		id: result.id,
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with a non-existent id but existent slug', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throws(test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should not be able to set links using an id', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element.links, {})
})

ava.test('.upsertElement() should update linked cards when inserting a link', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {}
	})

	const card = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card.id,
			to: thread.id
		}
	})

	const updatedCard = await test.context.backend.getElementById(card.id)
	const updatedThread = await test.context.backend.getElementById(thread.id)

	test.deepEqual(updatedCard.links, {
		'is attached to': [
			{
				$link: updatedCard.links['is attached to'][0].$link,
				id: thread.id
			}
		]
	})

	test.deepEqual(updatedThread.links, {
		'has attached element': [
			{
				$link: updatedThread.links['has attached element'][0].$link,
				id: card.id
			}
		]
	})
})

ava.test('.upsertElement() should not be able to set links using both an id and a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo-bar',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element.links, {})
})

ava.test('.upsertElement() should not be able to set links using a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'foo-bar',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementBySlug(result.slug)
	test.deepEqual(element.links, {})
})

ava.test('.upsertElement() should not be able to set links using no id nor slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'foo',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element.links, {})
})

ava.test('.upsertElement() should insert a card with an id', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		test: 'foo'
	})

	test.is(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.upsertElement() should replace an element given an insertion to the same id', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		test: 'foo',
		slug: 'foo',
		hello: 'world'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		slug: 'bar',
		test: 'bar'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id)
	test.deepEqual(element, result2)
})

ava.test('.upsertElement() should insert a card with a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'foo'
	})

	test.not(result.id, 'example')
	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.upsertElement() should replace an element given the slug but no id', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'foo',
		hello: 'world'
	})

	const result2 = await test.context.backend.upsertElement({
		slug: 'example',
		test: 'bar'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id)
	test.deepEqual(element, result2)
})

ava.test('.upsertElement() should insert a card with an id and a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		test: 'foo'
	})

	test.is(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.upsertElement() should replace a card with no slug with an id and a non-existent slug', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		test: 'foo'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		slug: 'example',
		test: 'foo'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id)
	test.deepEqual(element, result2)
})

ava.test('.upsertElement() should fail to insert an element with an existing id' +
         ', but matching the slug of another element', async (test) => {
	await test.context.backend.upsertElement({
		slug: 'example'
	})

	const result = await test.context.backend.upsertElement({
		slug: 'bar',
		test: 'foo'
	})

	await test.throws(test.context.backend.upsertElement({
		id: result.id,
		slug: 'example',
		test: 'foo'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should replace an element with an existing id and a non-matching slug', async (test) => {
	await test.context.backend.upsertElement({
		slug: 'example'
	})

	const result1 = await test.context.backend.upsertElement({
		slug: 'foo',
		test: 'foo'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		slug: 'bar',
		test: 'foo'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id)
	test.deepEqual(element, result2)
})

ava.test('.upsertElement() should replace an element with an existing id and the slug of the same element', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		slug: 'example'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		slug: 'example',
		test: 'foo'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id)
	test.deepEqual(element, result2)
})

ava.test('.upsertElement() should fail to insert an element with a non existing id and the slug of an element', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'example'
	})

	test.not(result.id, '9af7cf33-1a29-4f0c-a73b-f6a2b149850c')

	await test.throws(test.context.backend.upsertElement({
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should insert an element with a non-matching id nor slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id)
	test.deepEqual(element, result)
})

ava.test('.query() should query the database using JSON schema', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'foo',
		test: 1
	})

	await test.context.backend.upsertElement({
		type: 'test',
		slug: 'bar',
		test: 2
	})

	const result2 = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'baz',
		test: 3
	})

	const results = await test.context.backend.query({
		type: 'object',
		properties: {
			id: {
				type: 'string'
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
		required: [ 'id', 'slug', 'test', 'type' ]
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [ result1, result2 ])
})

ava.test('.query() should query an element by its id', async (test) => {
	const result = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'foo',
		test: 1
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should fail to query an element by its id', async (test) => {
	const result = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'foo',
		test: 1
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const results = await test.context.backend.query({
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

ava.test('.query() should query an element by its slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should fail to query an element by its slug', async (test) => {
	await test.context.backend.upsertElement({
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should not return unspecified properties', async (test) => {
	const result = await test.context.backend.upsertElement({
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to provide a sort function', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'baz',
		test: 3
	})

	const result2 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1
	})

	const result3 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'bar',
		test: 2
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'bar',
		test: 2,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement({
		type: 'card',
		slug: 'baz',
		test: 3,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to skip the results', async (test) => {
	await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement({
		type: 'card',
		slug: 'bar',
		test: 2,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	const result3 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'baz',
		test: 3,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to skip the results of a one-element query', async (test) => {
	const card = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should not skip the results of a one-element query if skip is set to zero', async (test) => {
	const card = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to limit the results of a one-element query to 0', async (test) => {
	const card = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should not omit the results of a one-element query if limit is set to one', async (test) => {
	const card = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to limit and skip the results', async (test) => {
	await test.context.backend.upsertElement({
		type: 'card',
		slug: 'foo',
		test: 1,
		data: {
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'bar',
		test: 2,
		data: {
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement({
		type: 'card',
		slug: 'baz',
		test: 3,
		data: {
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to sort the query using a key', async (test) => {
	const card1 = await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement({
		slug: 'bar',
		type: 'card',
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement({
		slug: 'baz',
		type: 'card',
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement({
		slug: 'qux',
		type: 'card',
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to sort the query in descending order', async (test) => {
	const card1 = await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement({
		slug: 'bar',
		type: 'card',
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement({
		slug: 'baz',
		type: 'card',
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement({
		slug: 'qux',
		type: 'card',
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to sort the query using an array of keys', async (test) => {
	const card1 = await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		data: {
			code: 'd'
		}
	})

	const card2 = await test.context.backend.upsertElement({
		slug: 'bar',
		type: 'card',
		data: {
			code: 'a'
		}
	})

	const card3 = await test.context.backend.upsertElement({
		slug: 'baz',
		type: 'card',
		data: {
			code: 'c'
		}
	})

	const card4 = await test.context.backend.upsertElement({
		slug: 'qux',
		type: 'card',
		data: {
			code: 'b'
		}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should apply sort before skip', async (test) => {
	const card1 = await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		name: 'd',
		data: {}
	})

	await test.context.backend.upsertElement({
		slug: 'bar',
		type: 'card',
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement({
		slug: 'baz',
		type: 'card',
		name: 'c',
		data: {}
	})

	await test.context.backend.upsertElement({
		slug: 'qux',
		type: 'card',
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should apply sort before limit', async (test) => {
	await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement({
		slug: 'bar',
		type: 'card',
		name: 'a',
		data: {}
	})

	await test.context.backend.upsertElement({
		slug: 'baz',
		type: 'card',
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement({
		slug: 'qux',
		type: 'card',
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query({
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

ava.test('.query() should be able to query using links', async (test) => {
	const thread1 = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {}
	})

	const thread2 = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'bar',
		active: true,
		data: {}
	})

	await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'baz',
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'qux',
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	const link1 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: thread1.id
		}
	})

	const card2 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'tux',
		active: true,
		data: {
			payload: 'bar',
			count: 2
		}
	})

	const link2 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: thread1.id
		}
	})

	const card3 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'fux',
		active: true,
		data: {
			payload: 'baz',
			count: 3
		}
	})

	const link3 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card3.id,
			to: thread2.id
		}
	})

	const results = await test.context.backend.query({
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
						$link: link1.id,
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
						$link: link2.id,
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
						$link: link3.id,
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

ava.test('.query() should be able to query using links when getting an element by id', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: message.id,
			to: thread.id
		}
	})

	const results = await test.context.backend.query({
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
						$link: link.id,
						active: true,
						slug: 'foo',
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						id: thread.id,
						links: {},
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

ava.test('.query() should be able to query using links when getting an element by slug', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement({
		slug: 'message-foobar',
		type: 'message',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: message.id,
			to: thread.id
		}
	})

	const results = await test.context.backend.query({
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
						$link: link.id,
						slug: 'foo',
						active: true,
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						id: thread.id,
						links: {},
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

ava.test('.query() should be able to query using links and an inverse name', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'mythread',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message1 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'foo',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const message2 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link1 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: message1.id,
			to: thread.id
		}
	})

	const link2 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: message2.id,
			to: thread.id
		}
	})

	const results = await test.context.backend.query({
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
						$link: link1.id,
						active: true,
						slug: 'foo',
						id: message1.id,
						links: {},
						type: 'message',
						data: {
							payload: 'foo'
						}
					},
					{
						$link: link2.id,
						active: true,
						slug: 'bar',
						id: message2.id,
						links: {},
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

ava.test('.query() should omit a result if a link does not match', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		slug: 'mythread',
		active: true,
		data: {}
	})

	const foo = await test.context.backend.upsertElement({
		type: 'foo',
		slug: 'foo',
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link1 = await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card1.id,
			to: thread.id
		}
	})

	const card2 = await test.context.backend.upsertElement({
		type: 'message',
		slug: 'baz',
		active: true,
		data: {
			payload: 'bar'
		}
	})

	await test.context.backend.upsertElement({
		type: 'link',
		active: true,
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: card2.id,
			to: foo.id
		}
	})

	const results = await test.context.backend.query({
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
						$link: link1.id,
						id: thread.id,
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

ava.test.cb('.stream() should report back new elements that match a certain type', (test) => {
	test.context.backend.stream({
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
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'foo',
				test: 1
			})

			emitter.close()
		})

		emitter.on('error', test.end)
		emitter.on('closed', test.end)

		return Bluebird.all([
			test.context.backend.insertElement({
				type: 'foo',
				slug: 'foo',
				test: 1
			}),
			test.context.backend.insertElement({
				type: 'bar',
				slug: 'bar',
				test: 3
			})
		])
	}).catch(test.end)
})

ava.test.cb('.stream() should report back changes to certain elements', (test) => {
	test.context.backend.insertElement({
		type: 'foo',
		slug: 'hello',
		test: 1
	}).then(() => {
		return test.context.backend.insertElement({
			type: 'bar',
			slug: 'qux',
			test: 1
		})
	}).then(() => {
		return test.context.backend.stream({
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

		return test.context.backend.upsertElement({
			slug: 'hello',
			type: 'foo',
			test: 2
		}).then(() => {
			return test.context.backend.upsertElement({
				slug: 'qux',
				type: 'bar',
				test: 2
			})
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should close without finding anything', (test) => {
	test.context.backend.stream({
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'foobarbazqux'
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.close()
		emitter.on('error', test.end)
		emitter.on('closed', test.end)
	}).catch(test.end)
})

ava.test.cb('.stream() should set "before" to null if it previously did not match the schema', (test) => {
	test.context.backend.insertElement({
		slug: 'foobarbaz',
		type: 'foo',
		test: '1'
	}).then((emitter) => {
		return test.context.backend.stream({
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

		return test.context.backend.upsertElement({
			slug: 'foobarbaz',
			type: 'foo',
			test: 1
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should filter the "before" section of a change', (test) => {
	test.context.backend.insertElement({
		type: 'foo',
		slug: 'hello',
		test: 1,
		extra: true
	}).then(() => {
		return test.context.backend.stream({
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

		return test.context.backend.upsertElement({
			slug: 'hello',
			type: 'foo',
			test: 2,
			extra: true
		})
	}).catch(test.end)
})

ava.test('.stream() should throw if the schema is invalid', async (test) => {
	await test.throws(test.context.backend.stream({
		type: 'object',
		properties: {
			type: {
				type: 'string',
				enum: [ 'thread', 'thread' ]
			}
		}
	}))
})
