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

ava.beforeEach(helpers.backend.beforeEach)
ava.afterEach(helpers.backend.afterEach)

ava('.disconnect() should not throw if called multiple times', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
	})
})

ava('.disconnect() should gracefully close streams', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.stream({
			type: 'object'
		})
		await test.context.backend.disconnect()
	})
})

ava('.getElementById() should return null if the element id is not present', async (test) => {
	const result = await test.context.backend.getElementById('4a962ad9-20b5-4dd8-a707-bf819593cc84', {
		type: 'card'
	})

	test.deepEqual(result, null)
})

ava('.getElementById() should not break the cache if trying to query a valid slug with it', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'foo'
	})

	const result1 = await test.context.backend.getElementById('example', {
		type: 'card'
	})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementBySlug('example', {
		type: 'card'
	})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should not break the cache if trying to query a valid id with it', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'foo'
	})

	const result1 = await test.context.backend.getElementBySlug(element.id, {
		type: 'card'
	})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementById(element.id, {
		type: 'card'
	})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should return null if the element slug is not present', async (test) => {
	const result = await test.context.backend.getElementBySlug('foo', {
		type: 'card'
	})

	test.deepEqual(result, null)
})

ava('.getElementBySlug() should fetch an element given its slug', async (test) => {
	const element = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'foo'
	})

	const result = await test.context.backend.getElementBySlug('example', {
		type: 'card'
	})

	test.deepEqual(result, element)
})

ava('.createTable() should be able to create a table', async (test) => {
	test.false(await test.context.backend.hasTable('foobar'))
	await test.context.backend.createTable('foobar')
	test.true(await test.context.backend.hasTable('foobar'))
})

ava('.createTable() should ignore continuous attempts to create the same table', async (test) => {
	test.false(await test.context.backend.hasTable('foobar'))
	await test.context.backend.createTable('foobar')
	await test.context.backend.createTable('foobar')
	await test.context.backend.createTable('foobar')
	test.true(await test.context.backend.hasTable('foobar'))
})

ava('.insertElement() should not insert an element without a slug nor an id to an existing table', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement({
		test: 'foo'
	}), errors.JellyfishDatabaseError)
})

ava('.insertElement() should insert an element with a non-existent slug', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		type: 'card'
	})

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element, result)
})

ava('.insertElement() should not insert an element with a user defined id', async (test) => {
	const result = await test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should insert an element with a non-existent id and slug', async (test) => {
	const result = await test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		type: 'card',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should not be able to set any links', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		type: 'card',
		links: {
			foo: 'bar'
		}
	})

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element.links, {})
})

ava('.insertElement() should not re-use the id when inserting an element with an existent id', async (test) => {
	const result1 = await test.context.backend.insertElement({
		slug: 'foo',
		type: 'card',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement({
		id: result1.id,
		slug: 'bar',
		type: 'card',
		foo: 'baz'
	})

	test.not(result1.id, result2.id)
})

ava('.insertElement() should fail to insert an element with an existent slug', async (test) => {
	await test.context.backend.insertElement({
		slug: 'bar'
	})

	await test.throwsAsync(test.context.backend.insertElement({
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava('.insertElement() should not re-use ids when inserting an' +
				' element with an existent id but non-existent slug', async (test) => {
	const result1 = await test.context.backend.insertElement({
		slug: 'foo',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement({
		id: result1.id,
		slug: 'bar',
		foo: 'baz'
	})

	test.not(result2.id, result1.id)
})

ava('.insertElement() should fail to insert an element with a non-existent id but existent slug', async (test) => {
	const result = await test.context.backend.insertElement({
		slug: 'foo',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throwsAsync(test.context.backend.insertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava('.upsertElement() should not be able to set links using an id', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		type: 'card',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element.links, {})
})

ava('.upsertElement() should update linked cards when inserting a link', async (test) => {
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

	const updatedCard = await test.context.backend.getElementById(card.id, {
		type: 'message'
	})

	const updatedThread = await test.context.backend.getElementById(thread.id, {
		type: 'thread'
	})

	test.deepEqual(updatedCard.links, {
		'is attached to': [
			{
				$link: updatedCard.links['is attached to'][0].$link,
				id: thread.id,
				slug: 'foo'
			}
		]
	})

	test.deepEqual(updatedThread.links, {
		'has attached element': [
			{
				$link: updatedThread.links['has attached element'][0].$link,
				id: card.id,
				slug: 'bar'
			}
		]
	})
})

ava('.upsertElement() should not be able to set links using both an id and a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		slug: 'foo-bar',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element.links, {})
})

ava('.upsertElement() should not be able to set links using a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'foo-bar',
		type: 'card',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementBySlug(result.slug, {
		type: 'card'
	})

	test.deepEqual(element.links, {})
})

ava('.upsertElement() should not be able to set links using no id nor slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'foo',
		type: 'card',
		links: {
			foo: 'bar'
		},
		test: 'foo'
	})

	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element.links, {})
})

ava('.upsertElement() should not be able to change a slug', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		test: 'foo',
		slug: 'foo',
		hello: 'world'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		slug: 'bar',
		hello: 'world'
	})

	test.not(result1.id, result2.id)
	test.is(result1.slug, 'foo')
})

ava('.upsertElement() should insert a card with a slug', async (test) => {
	const result = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'foo'
	})

	test.not(result.id, 'example')
	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(element, result)
})

ava('.upsertElement() should replace an element given the slug but no id', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'foo',
		hello: 'world'
	})

	const result2 = await test.context.backend.upsertElement({
		slug: 'example',
		type: 'card',
		test: 'bar'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id, {
		type: 'card'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should not let clients pick their own ids', async (test) => {
	const result = await test.context.backend.upsertElement({
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card',
		slug: 'example',
		test: 'foo'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(result.id, {
		type: 'card'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.upsertElement() should not be able to upsert without a slug nor an id', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement({
		test: 'foo'
	}), errors.JellyfishDatabaseError)
})

ava('.upsertElement() should not consider ids when inserting an element with an existing id' +
         ', but matching the slug of another element', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		slug: 'example'
	})

	const result2 = await test.context.backend.upsertElement({
		slug: 'bar',
		test: 'foo'
	})

	const result3 = await test.context.backend.upsertElement({
		id: result2.id,
		slug: 'example',
		test: 'foo'
	})

	test.deepEqual(result3, {
		id: result1.id,
		slug: 'example',
		test: 'foo'
	})
})

ava('.upsertElement() should replace an element with an existing id and the slug of the same element', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		type: 'card',
		slug: 'example'
	})

	const result2 = await test.context.backend.upsertElement({
		id: result1.id,
		type: 'card',
		slug: 'example',
		test: 'foo'
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(result1.id, {
		type: 'card'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should ignore the id when' +
					' inserting an element with a non existing id and the slug of an element', async (test) => {
	const result1 = await test.context.backend.upsertElement({
		slug: 'example'
	})

	const result2 = await test.context.backend.upsertElement({
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	})

	test.not(result2.id, '9af7cf33-1a29-4f0c-a73b-f6a2b149850c')
	test.deepEqual(result2, {
		id: result1.id,
		slug: 'example',
		test: 'foo'
	})
})

ava('.upsertElement() should not insert an element with a non-matching id nor slug', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement({
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		test: 'foo'
	}), errors.JellyfishDatabaseError)
})

ava('.query() should query the database using JSON schema', async (test) => {
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

ava('.query() should give the same results when omitting additionalProperties and additionalProperties:false', async (test) => {
	await test.context.backend.upsertElement({
		type: 'example',
		slug: 'foo',
		test: 1
	})

	await test.context.backend.upsertElement({
		type: 'test',
		slug: 'bar',
		test: 2
	})

	await test.context.backend.upsertElement({
		type: 'example',
		slug: 'baz',
		test: 3
	})

	const results1 = await test.context.backend.query({
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

	const results2 = await test.context.backend.query({
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

ava('.query() should fail to query an element by its id', async (test) => {
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

ava('.query() should query an element by its slug', async (test) => {
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

ava('.query() should fail to query an element by its slug', async (test) => {
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

ava('.query() should not return unspecified properties', async (test) => {
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

ava('.query() should be able to provide a sort function', async (test) => {
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

ava('.query() should be able to limit the results', async (test) => {
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

ava('.query() should be able to skip the results', async (test) => {
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

ava('.query() should be able to skip the results of a one-element query', async (test) => {
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

ava('.query() should not skip the results of a one-element query if skip is set to zero', async (test) => {
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

ava('.query() should be able to limit the results of a one-element query to 0', async (test) => {
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

ava('.query() should not omit the results of a one-element query if limit is set to one', async (test) => {
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

ava('.query() should be able to limit and skip the results', async (test) => {
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

ava('.query() should be able to sort the query using a key', async (test) => {
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

ava('.query() should be able to sort the query in descending order', async (test) => {
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

ava('.query() should be able to sort the query using an array of keys', async (test) => {
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

ava('.query() should apply sort before skip', async (test) => {
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

ava('.query() should apply sort before limit', async (test) => {
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

ava('.query() should correctly honour top level additionalProperties: true', async (test) => {
	const user1 = await test.context.backend.insertElement({
		slug: 'user-johndoe',
		type: 'user'
	})
	const user2 = await test.context.backend.insertElement({
		slug: 'user-janedoe',
		type: 'user'
	})
	const results1 = await test.context.backend.query({
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
	const results2 = await test.context.backend.query({
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
	const results3 = await test.context.backend.query({
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
	const results4 = await test.context.backend.query({
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
			slug: 'user-janedoe',
			type: 'user'
		},
		{
			id: user1.id,
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

ava('.query() should be able to query using links', async (test) => {
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

ava('.query() should be able to query using links when getting an element by id', async (test) => {
	const thread = await test.context.backend.upsertElement({
		type: 'thread',
		links: {},
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement({
		type: 'message',
		links: {},
		slug: 'bar',
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement({
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

ava('.query() should be able to query using links when getting an element by slug', async (test) => {
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

ava('.query() should be able to query using links and an inverse name', async (test) => {
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

	const link2 = await test.context.backend.upsertElement({
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

ava('.query() should omit a result if a link does not match', async (test) => {
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
						active: true,
						data: {},
						id: thread.id,
						links: {},
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

ava.cb('.stream() should report back changes to certain elements', (test) => {
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

ava.cb('.stream() should close without finding anything', (test) => {
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

ava.cb('.stream() should set "before" to null if it previously did not match the schema', (test) => {
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

ava.cb('.stream() should filter the "before" section of a change', (test) => {
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

ava('.stream() should throw if the schema is invalid', async (test) => {
	await test.throwsAsync(test.context.backend.stream({
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
			type: 'stress-test',
			time
		}

		try {
			await Bluebird.all([
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object)),
				test.context.backend.upsertElement(_.clone(object))
			])
		} catch (error) {
			test.true(error instanceof errors.JellyfishElementAlreadyExists)
		}

		const results = await test.context.backend.query({
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
			time
		}

		try {
			await Bluebird.all([
				test.context.backend.insertElement(_.clone(object)),
				test.context.backend.insertElement(_.clone(object)),
				test.context.backend.insertElement(_.clone(object)),
				test.context.backend.insertElement(_.clone(object))
			])
		} catch (error) {
			test.true(error instanceof errors.JellyfishElementAlreadyExists)
		}

		const results = await test.context.backend.query({
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
