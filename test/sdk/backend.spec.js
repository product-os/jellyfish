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
const randomstring = require('randomstring')
const Backend = require('../../lib/sdk/backend')
const errors = require('../../lib/sdk/errors')

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

ava.test('.disconnect() should not throw if called multiple times', async (test) => {
	test.notThrows(async () => {
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
		await test.context.backend.disconnect()
	})
})

ava.test('.getElementById() should return null if the table does not exist', async (test) => {
	const result = await test.context.backend.getElementById('foobarbaz', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.deepEqual(result, null)
})

ava.test('.getElementBySlug() should return null if the table does not exist', async (test) => {
	const result = await test.context.backend.getElementBySlug('foobarbaz', 'card')
	test.deepEqual(result, null)
})

ava.test('.getElementById() should return null if the element id is not present', async (test) => {
	await test.context.backend.createTable('test')
	const result = await test.context.backend.getElementById('test', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.deepEqual(result, null)
})

ava.test('.getElementBySlug() should return null if the element slug is not present', async (test) => {
	await test.context.backend.createTable('test')
	const result = await test.context.backend.getElementBySlug('test', 'foo')
	test.deepEqual(result, null)
})

ava.test('.getElementBySlug() should fetch an element given its slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.upsertElement('test', {
		slug: 'example',
		test: 'foo'
	})

	const result = await test.context.backend.getElementBySlug('test', 'example')
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

ava.test('.insertElement() should insert an element without a slug nor an id to an existing table', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.insertElement('test', {
		test: 'foo'
	})

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: uuid,
		test: 'foo'
	})
})

ava.test('.insertElement() should insert an element without a slug nor an id to a non-existing table', async (test) => {
	const uuid = await test.context.backend.insertElement('foobar', {
		test: 'foo'
	})

	const element = await test.context.backend.getElementById('foobar', uuid)

	test.deepEqual(element, {
		id: uuid,
		test: 'foo'
	})
})

ava.test('.insertElement() should insert an element with a non-existent slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.insertElement('test', {
		slug: 'foo'
	})

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: uuid,
		slug: 'foo'
	})
})

ava.test('.insertElement() should insert an element with a non-existent id', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.insertElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		foo: 'bar'
	})

	test.is(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		foo: 'bar'
	})
})

ava.test('.insertElement() should insert an element with a non-existent id and slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.insertElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		foo: 'bar'
	})

	test.is(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		foo: 'bar'
	})
})

ava.test('.insertElement() should fail to insert an element with an existent id', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.insertElement('test', {
		foo: 'bar'
	})

	await test.throws(test.context.backend.insertElement('test', {
		id: uuid,
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with an existent slug', async (test) => {
	await test.context.backend.createTable('test')

	await test.context.backend.insertElement('test', {
		slug: 'bar'
	})

	await test.throws(test.context.backend.insertElement('test', {
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with an existent id but non-existent slug', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.insertElement('test', {
		slug: 'foo',
		foo: 'bar'
	})

	await test.throws(test.context.backend.insertElement('test', {
		id: uuid,
		slug: 'bar',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.insertElement() should fail to insert an element with a non-existent id but existent slug', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.insertElement('test', {
		slug: 'foo',
		foo: 'bar'
	})

	test.not(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throws(test.context.backend.insertElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'foo',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.updateElement() should fail to update an element with no id nor slug', async (test) => {
	await test.context.backend.createTable('test')
	await test.throws(test.context.backend.updateElement('test', {
		foo: 'baz'
	}), errors.JellyfishNoIdentifier)
})

ava.test('.updateElement() should fail to update an element by an id that does not exist', async (test) => {
	await test.context.backend.createTable('test')

	const element = await test.context.backend.getElementById('test', '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	test.deepEqual(element, null)

	await test.throws(test.context.backend.updateElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		foo: 'baz'
	}), errors.JellyfishNoElement)
})

ava.test('.updateElement() should fail to update an element by a slug that does not exist', async (test) => {
	await test.context.backend.createTable('test')

	const element = await test.context.backend.getElementBySlug('test', 'foo')
	test.deepEqual(element, null)

	await test.throws(test.context.backend.updateElement('test', {
		slug: 'foo',
		foo: 'baz'
	}), errors.JellyfishNoElement)
})

ava.test('.updateElement() should fail to update an element by an id and a slug where none exist', async (test) => {
	await test.context.backend.createTable('test')

	await test.throws(test.context.backend.updateElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'hello',
		foo: 'baz'
	}), errors.JellyfishNoElement)
})

ava.test('.updateElement() should replace an element given an update to the same id', async (test) => {
	await test.context.backend.createTable('test')
	const uuid1 = await test.context.backend.insertElement('test', {
		test: 'foo',
		hello: 'world'
	})

	const uuid2 = await test.context.backend.updateElement('test', {
		id: uuid1,
		test: 'bar'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)
	test.deepEqual(element, {
		id: uuid1,
		test: 'bar'
	})
})

ava.test('.updateElement() should replace an element given an update to the same slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid1 = await test.context.backend.insertElement('test', {
		slug: 'foo',
		name: 'johndoe'
	})

	const uuid2 = await test.context.backend.updateElement('test', {
		slug: 'foo',
		name: 'janedoe'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)
	test.deepEqual(element, {
		id: uuid1,
		slug: 'foo',
		name: 'janedoe'
	})
})

ava.test('.updateElement() should replace an element given an update to the same id and slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid1 = await test.context.backend.insertElement('test', {
		slug: 'foo',
		name: 'johndoe'
	})

	const uuid2 = await test.context.backend.updateElement('test', {
		id: uuid1,
		slug: 'foo',
		name: 'janedoe'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)
	test.deepEqual(element, {
		id: uuid1,
		slug: 'foo',
		name: 'janedoe'
	})
})

ava.test('.updateElement() should fail to update an element by an id and a slug where the slug already exist', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.insertElement('test', {
		slug: 'hello'
	})

	test.not(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throws(test.context.backend.updateElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'hello',
		foo: 'baz'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should insert a card without a slug nor an id', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.upsertElement('test', {
		test: 'foo'
	})

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: uuid,
		test: 'foo'
	})
})

ava.test('.upsertElement() should create multiple elements given same content and no id', async (test) => {
	await test.context.backend.createTable('test')

	const object = {
		test: 'foo'
	}

	const uuid1 = await test.context.backend.upsertElement('test', object)
	const uuid2 = await test.context.backend.upsertElement('test', object)
	const uuid3 = await test.context.backend.upsertElement('test', object)

	test.not(uuid1, uuid2)
	test.not(uuid2, uuid3)
	test.not(uuid3, uuid1)

	const element1 = await test.context.backend.getElementById('test', uuid1)
	const element2 = await test.context.backend.getElementById('test', uuid2)
	const element3 = await test.context.backend.getElementById('test', uuid3)

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

ava.test('.upsertElement() should insert a card with an id', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.upsertElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		test: 'foo'
	})

	test.is(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		test: 'foo'
	})
})

ava.test('.upsertElement() should replace an element given an insertion to the same id', async (test) => {
	await test.context.backend.createTable('test')
	const uuid1 = await test.context.backend.upsertElement('test', {
		test: 'foo',
		hello: 'world'
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		id: uuid1,
		test: 'bar'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)
	test.deepEqual(element, {
		id: uuid1,
		test: 'bar'
	})
})

ava.test('.upsertElement() should insert a card with a slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.upsertElement('test', {
		slug: 'example',
		test: 'foo'
	})

	test.not(uuid, 'example')

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: uuid,
		slug: 'example',
		test: 'foo'
	})
})

ava.test('.upsertElement() should replace an element given the slug but no id', async (test) => {
	await test.context.backend.createTable('test')

	const uuid1 = await test.context.backend.upsertElement('test', {
		slug: 'example',
		test: 'foo',
		hello: 'world'
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		slug: 'example',
		test: 'bar'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)

	test.deepEqual(element, {
		id: uuid1,
		slug: 'example',
		test: 'bar'
	})
})

ava.test('.upsertElement() should insert a card with an id and a slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid = await test.context.backend.upsertElement('test', {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		test: 'foo'
	})

	test.is(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'example',
		test: 'foo'
	})
})

ava.test('.upsertElement() should replace a card with no slug with an id and a non-existent slug', async (test) => {
	await test.context.backend.createTable('test')
	const uuid1 = await test.context.backend.upsertElement('test', {
		test: 'foo'
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		id: uuid1,
		slug: 'example',
		test: 'foo'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)

	test.deepEqual(element, {
		id: uuid1,
		slug: 'example',
		test: 'foo'
	})
})

ava.test('.upsertElement() should fail to insert an element with an existing id' +
         ', but matching the slug of another element', async (test) => {
	await test.context.backend.createTable('test')

	await test.context.backend.upsertElement('test', {
		slug: 'example'
	})

	const uuid = await test.context.backend.upsertElement('test', {
		test: 'foo'
	})

	await test.throws(test.context.backend.upsertElement('test', {
		id: uuid,
		slug: 'example',
		test: 'foo'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should replace an element with an existing id and a non-matching slug', async (test) => {
	await test.context.backend.createTable('test')

	await test.context.backend.upsertElement('test', {
		slug: 'example'
	})

	const uuid1 = await test.context.backend.upsertElement('test', {
		test: 'foo'
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		id: uuid1,
		slug: 'bar',
		test: 'foo'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)

	test.deepEqual(element, {
		id: uuid1,
		slug: 'bar',
		test: 'foo'
	})
})

ava.test('.upsertElement() should replace an element with an existing id and the slug of the same element', async (test) => {
	await test.context.backend.createTable('test')

	const uuid1 = await test.context.backend.upsertElement('test', {
		slug: 'example'
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		id: uuid1,
		slug: 'example',
		test: 'foo'
	})

	test.is(uuid1, uuid2)

	const element = await test.context.backend.getElementById('test', uuid1)

	test.deepEqual(element, {
		id: uuid1,
		slug: 'example',
		test: 'foo'
	})
})

ava.test('.upsertElement() should fail to insert an element with a non existing id and the slug of an element', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		slug: 'example'
	})

	test.not(uuid, '9af7cf33-1a29-4f0c-a73b-f6a2b149850c')

	await test.throws(test.context.backend.upsertElement('test', {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	}), errors.JellyfishElementAlreadyExists)
})

ava.test('.upsertElement() should insert an element with a non-matching id nor slug', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	})

	const element = await test.context.backend.getElementById('test', uuid)

	test.deepEqual(element, {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		test: 'foo'
	})
})

ava.test('.query() should query the database using JSON schema', async (test) => {
	await test.context.backend.createTable('test')

	const uuid1 = await test.context.backend.upsertElement('test', {
		type: 'example',
		test: 1
	})

	await test.context.backend.upsertElement('test', {
		type: 'test',
		test: 2
	})

	const uuid2 = await test.context.backend.upsertElement('test', {
		type: 'example',
		test: 3
	})

	const results = await test.context.backend.query('test', {
		type: 'object',
		properties: {
			id: {
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
		required: [ 'id', 'test', 'type' ]
	})

	test.deepEqual(_.sortBy(results, [ 'test' ]), [
		{
			id: uuid1,
			type: 'example',
			test: 1
		},
		{
			id: uuid2,
			type: 'example',
			test: 3
		}
	])
})

ava.test('.query() should query an element by its id', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		type: 'example',
		test: 1
	})

	const results = await test.context.backend.query('test', {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: uuid
			}
		},
		required: [ 'id' ]
	})

	test.deepEqual(results, [
		{
			id: uuid,
			type: 'example',
			test: 1
		}
	])
})

ava.test('.query() should fail to query an element by its id', async (test) => {
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		type: 'example',
		test: 1
	})

	test.not(uuid, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const results = await test.context.backend.query('test', {
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
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query('test', {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: 'hello'
			}
		},
		required: [ 'slug' ]
	})

	test.deepEqual(results, [
		{
			id: uuid,
			type: 'example',
			slug: 'hello',
			test: 1
		}
	])
})

ava.test('.query() should fail to query an element by its slug', async (test) => {
	await test.context.backend.createTable('test')

	await test.context.backend.upsertElement('test', {
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query('test', {
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
	await test.context.backend.createTable('test')

	const uuid = await test.context.backend.upsertElement('test', {
		type: 'example',
		slug: 'hello',
		test: 1
	})

	const results = await test.context.backend.query('test', {
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
			id: uuid,
			slug: 'hello'
		}
	])
})

ava.test.cb('.stream() should report back new elements that match a certain type', (test) => {
	test.context.backend.createTable('test').then(() => {
		return test.context.backend.stream('test', {
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
		})
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
			test.context.backend.insertElement('test', {
				type: 'foo',
				test: 1
			}),
			test.context.backend.insertElement('test', {
				type: 'bar',
				test: 3
			})
		])
	}).catch(test.end)
})

ava.test.cb('.stream() should report back changes to certain elements', (test) => {
	test.context.backend.createTable('test').then(() => {
		return test.context.backend.insertElement('test', {
			type: 'foo',
			slug: 'hello',
			test: 1
		})
	}).then(() => {
		return test.context.backend.insertElement('test', {
			type: 'bar',
			slug: 'qux',
			test: 1
		})
	}).then(() => {
		return test.context.backend.stream('test', {
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

		return test.context.backend.updateElement('test', {
			slug: 'hello',
			type: 'foo',
			test: 2
		}).then(() => {
			return test.context.backend.updateElement('test', {
				slug: 'qux',
				type: 'bar',
				test: 2
			})
		})
	}).catch(test.end)
})

ava.test.cb('.stream() should close without finding anything', (test) => {
	test.context.backend.createTable('test').then(() => {
		return test.context.backend.stream('test', {
			type: 'object',
			properties: {
				slug: {
					type: 'string',
					const: 'foobarbazqux'
				}
			},
			required: [ 'slug' ]
		})
	}).then((emitter) => {
		emitter.close()
		emitter.on('error', test.end)
		emitter.on('closed', test.end)
	}).catch(test.end)
})
