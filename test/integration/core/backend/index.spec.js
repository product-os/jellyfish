/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const errors = require('../../../../lib/core/errors')
const helpers = require('./helpers')

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

ava('should only expose the required methods', (test) => {
	const methods = Object.getOwnPropertyNames(
		Reflect.getPrototypeOf(test.context.backend))

	/*
	 * Think very hard before extending this interface, as its
	 * very easy to add cruft over time that will get abused.
	 * All private methods should remain private.
	 */
	test.deepEqual(methods, [
		'constructor',
		'connect',
		'disconnect',
		'reset',
		'insertElement',
		'upsertElement',
		'getElementById',
		'getElementBySlug',
		'getElementsById',
		'query',
		'stream',
		'getStatus'
	])
})

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
		type: 'card@1.0.0'
	})

	test.deepEqual(result, [])
})

ava('.getElementsById() should return an found element', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		data: {},
		links: {},
		active: true
	})

	const result = await test.context.backend.getElementsById(test.context.context, [ element.id ], {
		type: 'card@1.0.0'
	})

	test.deepEqual(result, [ element ])
})

ava('.getElementsById() should omit not found elements', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		data: {},
		links: {},
		active: true
	})

	const result = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card@1.0.0'
		})

	test.deepEqual(result, [ element ])
})

ava('.getElementsById() should get deterministic results', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		linked_at: {},
		links: {},
		markers: [],
		requires: [],
		data: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result1 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card@1.0.0'
		})

	const result2 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card@1.0.0'
		})

	const result3 = await test.context.backend.getElementsById(
		test.context.context, [ element.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84' ], {
			type: 'card@1.0.0'
		})

	test.deepEqual(result1, result2)
	test.deepEqual(result2, result3)
})

ava('.getElementById() should return null if the element id is not present', async (test) => {
	const result = await test.context.backend.getElementById(test.context.context, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
		type: 'card@1.0.0'
	})

	test.deepEqual(result, null)
})

ava('.getElementById() should not break the cache if trying to query a valid slug with it', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card@1.0.0',
		links: {},
		data: {},
		linked_at: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result1 = await test.context.backend.getElementById(
		test.context.context, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementBySlug(
		test.context.context, '4a962ad9-20b5-4dd8-a707-bf819593cc84@1.0.0', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should not break the cache if trying to query a valid id with it', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		linked_at: {},
		links: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result1 = await test.context.backend.getElementBySlug(
		test.context.context, `${element.id}@${element.version}`, {
			type: 'card@1.0.0'
		})

	test.deepEqual(result1, null)

	const result2 = await test.context.backend.getElementById(
		test.context.context, element.id, {
			type: 'card@1.0.0'
		})

	test.deepEqual(result2, element)
})

ava('.getElementBySlug() should return null if the element slug is not present', async (test) => {
	const result = await test.context.backend.getElementBySlug(
		test.context.context, 'foo@1.0.0', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result, null)
})

ava('.getElementBySlug() should fetch an element given its slug', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		linked_at: {},
		data: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result = await test.context.backend.getElementBySlug(
		test.context.context, 'example@1.0.0', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result, element)
})

ava('.getElementBySlug() should return null given the wrong version', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		linked_at: {},
		data: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result = await test.context.backend.getElementBySlug(
		test.context.context, 'example@2.0.0', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result, null)
})

ava('.getElementBySlug() should fetch an element given the correct version', async (test) => {
	const element = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		linked_at: {},
		data: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result = await test.context.backend.getElementBySlug(
		test.context.context, 'example@1.0.0', {
			type: 'card@1.0.0'
		})

	test.deepEqual(result, element)
})

ava('.insertElement() should not insert an element without a slug nor an id to an existing table', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		version: '1.0.0',
		tags: [],
		markers: [],
		data: {},
		links: {},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true
	}), {
		instanceOf: errors.JellyfishDatabaseError
	})
})

ava('.insertElement() should not insert an element without a type', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: 'foo-bar-baz',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		data: {},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true
	}), {
		instanceOf: errors.JellyfishDatabaseError
	})
})

ava('.insertElement() should fail to insert an element with a very long slug', async (test) => {
	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: _.join(_.times(500, _.constant('x')), ''),
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		requires: [],
		data: {},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		type: 'card@1.0.0',
		active: true
	}), {
		instanceOf: errors.JellyfishInvalidSlug
	})
})

ava('.insertElement() should insert an element with a non-existent slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		requires: [],
		data: {},
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true,
		type: 'card@1.0.0'
	})

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(element, result)
})

ava('.insertElement() should not insert an element with a user defined id', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		active: true,
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		type: 'card@1.0.0',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should insert an element with a non-existent id and slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		active: true,
		version: '1.0.0',
		links: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		slug: 'example',
		type: 'card@1.0.0',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.insertElement() should not re-use the id when inserting an element with an existent id', async (test) => {
	const result1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		data: {},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		type: 'card@1.0.0',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement(test.context.context, {
		id: result1.id,
		slug: 'bar',
		version: '1.0.0',
		tags: [],
		data: {},
		links: {},
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true,
		type: 'card@1.0.0',
		foo: 'baz'
	})

	test.not(result1.id, result2.id)
})

ava('.insertElement() should fail to insert an element with an existent slug', async (test) => {
	await test.context.backend.insertElement(test.context.context, {
		slug: 'bar',
		version: '1.0.0',
		tags: [],
		markers: [],
		data: {},
		links: {},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true,
		type: 'card@1.0.0'
	})

	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		slug: 'bar',
		active: true,
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		requires: [],
		data: {},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		type: 'card@1.0.0',
		foo: 'baz'
	}), {
		instanceOf: errors.JellyfishElementAlreadyExists
	})
})

ava('.insertElement() should not re-use ids when inserting an' +
	' element with an existent id but non-existent slug', async (test) => {
	const result1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		active: true,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		data: {},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		type: 'card@1.0.0',
		foo: 'bar'
	})

	const result2 = await test.context.backend.insertElement(test.context.context, {
		id: result1.id,
		slug: 'bar',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		data: {},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true,
		type: 'card@1.0.0',
		foo: 'baz'
	})

	test.not(result2.id, result1.id)
})

ava('.insertElement() should fail to insert an element with a non-existent id but existent slug', async (test) => {
	const result = await test.context.backend.insertElement(test.context.context, {
		slug: 'foo',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		requires: [],
		data: {},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true,
		type: 'card@1.0.0',
		foo: 'bar'
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')

	await test.throwsAsync(test.context.backend.insertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		data: {},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		active: true,
		slug: 'foo',
		foo: 'baz'
	}), {
		instanceOf: errors.JellyfishElementAlreadyExists
	})
})

ava('.upsertElement() should not be able to change a slug', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'foo',
		data: {},
		hello: 'world',
		linked_at: {},
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: result1.id,
		type: 'card@1.0.0',
		slug: 'bar',
		links: {},
		hello: 'world',
		linked_at: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		data: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.not(result1.id, result2.id)
	test.is(result1.slug, 'foo')
})

ava('.upsertElement() should not insert an element without a type', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		slug: 'foo-bar-baz',
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		data: {},
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	}), {
		instanceOf: errors.JellyfishDatabaseError
	})
})

ava('.upsertElement() should insert a card with a slug', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		linked_at: {},
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.not(result.id, 'example')
	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(element, result)
})

ava('.upsertElement() should replace an element given the slug but no id', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		hello: 'world',
		data: {},
		linked_at: {},
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		linked_at: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(test.context.context, result1.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should not let clients pick their own ids', async (test) => {
	const result = await test.context.backend.upsertElement(test.context.context, {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		type: 'card@1.0.0',
		active: true,
		slug: 'example',
		links: {},
		linked_at: {},
		data: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString()
	})

	test.not(result.id, '4a962ad9-20b5-4dd8-a707-bf819593cc84')
	const element = await test.context.backend.getElementById(test.context.context, result.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(Object.assign({}, element, {
		id: result.id
	}), result)
})

ava('.upsertElement() should not be able to upsert without a slug nor an id', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		version: '1.0.0',
		tags: [],
		data: {},
		markers: [],
		links: {},
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	}), {
		instanceOf: errors.JellyfishDatabaseError
	})
})

ava('.upsertElement() should not consider ids when inserting an element with an existing id' +
	', but matching the slug of another element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		active: true,
		version: '1.0.0',
		links: {},
		tags: [],
		data: {},
		linked_at: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		type: 'card@1.0.0'
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		active: true,
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		linked_at: {},
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString()
	})

	const result3 = await test.context.backend.upsertElement(test.context.context, {
		id: result2.id,
		slug: 'example',
		type: 'card@1.0.0',
		links: {},
		data: {},
		version: '1.0.0',
		linked_at: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.deepEqual(result3, {
		id: result1.id,
		created_at: result3.created_at,
		updated_at: result3.updated_at,
		capabilities: [],
		active: true,
		name: null,
		type: 'card@1.0.0',
		linked_at: {},
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		data: {},
		slug: 'example'
	})
})

ava('.upsertElement() should replace an element with an existing id and the slug of the same element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'example',
		version: '1.0.0',
		links: {},
		data: {},
		tags: [],
		linked_at: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: result1.id,
		type: 'card@1.0.0',
		slug: 'example',
		links: {},
		data: {},
		version: '1.0.0',
		linked_at: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.is(result1.id, result2.id)
	const element = await test.context.backend.getElementById(test.context.context, result1.id, {
		type: 'card@1.0.0'
	})

	test.deepEqual(element, result2)
})

ava('.upsertElement() should ignore the id when' +
	' inserting an element with a non existing id and the slug of an element', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'example',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		data: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		slug: 'example',
		type: 'card@1.0.0',
		links: {},
		version: '1.0.0',
		linked_at: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	test.not(result2.id, '9af7cf33-1a29-4f0c-a73b-f6a2b149850c')
	test.deepEqual(result2, {
		id: result1.id,
		created_at: result2.created_at,
		updated_at: result2.updated_at,
		links: {},
		name: null,
		version: '1.0.0',
		tags: [],
		linked_at: {},
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		active: true,
		slug: 'example',
		type: 'card@1.0.0'
	})
})

ava('.upsertElement() should not insert an element with a non-matching id nor slug', async (test) => {
	await test.throwsAsync(test.context.backend.upsertElement(test.context.context, {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		version: '1.0.0',
		tags: [],
		data: {},
		links: {},
		linked_at: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	}), {
		instanceOf: errors.JellyfishDatabaseError
	})
})

ava('.query() should correctly take string contraints on the uuid', async (test) => {
	const results = await test.context.backend.query(
		test.context.context, {
			type: 'object',
			additionalProperties: true,
			required: [ 'id' ],
			properties: {
				id: {
					type: 'string',
					regexp: {
						pattern: 'assume',
						flags: 'i'
					}
				}
			}
		})

	test.deepEqual(results, [])
})

ava('.query() should query the database using JSON schema', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'example@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		tags: [],
		links: {},
		data: {
			test: 1
		},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'test@1.0.0',
		slug: 'bar',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		data: {
			test: 2
		},
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'example@1.0.0',
		slug: 'baz',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		data: {
			test: 3
		},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
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
			data: {
				type: 'object',
				required: [ 'test' ],
				properties: {
					test: {
						type: 'number'
					}
				}
			},
			type: {
				type: 'string',
				pattern: '^example@1.0.0$'
			}
		},
		required: [ 'id', 'active', 'slug', 'data', 'type' ]
	})

	test.deepEqual(_.sortBy(results, 'data.test'), [ result1, result2 ])
})

ava('.query() should escape malicious query keys', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.backend.query(test.context.context, {
			type: 'object',
			properties: {
				data: {
					type: 'object',
					properties: {
						'Robert\'); DROP TABLE cards; --': {
							type: 'object',
							properties: {
								'Robert\'); DROP TABLE cards; --': {
									type: 'string',
									const: 'foo@1.0.0'
								}
							}
						}
					}
				}
			},
			required: [ 'data' ]
		})
	})
})

ava('.query() should escape malicious query values', async (test) => {
	const injection = 'id FROM cards; DROP TABLE cards; COMMIT; SELECT *'
	const error = await test.throwsAsync(() => {
		return test.context.backend.query(test.context.context, {
			type: 'object',
			properties: {
				[injection]: {
					type: 'string',
					const: 'foo@1.0.0'
				}
			},
			required: [ injection ]
		})
	})

	test.is(error.message, `column cards.${injection} does not exist`)

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
				name: {
					type: 'string',
					const: 'Robert\'; DROP TABLE cards; --'
				}
			},
			required: [ 'name' ]
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
			required: [ 'data' ],
			properties: {
				data: {
					type: 'object',
					required: [ 'other', 'next' ],
					properties: {
						other: {
							type: [ 'string', 'number' ]
						},
						[next]: generate(times - 1, seeds, index + 1)
					}
				}
			}
		}
	}

	const results1 = await test.context.backend.query(test.context.context, generate(50, [ 'foo', 'bar' ]))
	test.deepEqual(results1, [])

	const results2 = await test.context.backend.query(test.context.context, generate(80, [ 'foo', 'bar' ]))
	test.deepEqual(results2, [])
})

ava('.query() should give the same results when omitting additionalProperties and additionalProperties:false', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'test',
		slug: 'bar',
		version: '1.0.0',
		links: {},
		data: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		active: true
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'example',
		slug: 'baz',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		data: {},
		capabilities: [],
		created_at: new Date().toISOString(),
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
		type: 'example@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		data: {
			test: 1
		},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		slug: 'foo',
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
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		data: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
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
		type: 'example@1.0.0',
		slug: 'hello',
		links: {},
		version: '1.0.0',
		tags: [],
		data: {
			test: 1
		},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
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
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		requires: [],
		data: {
			test: 1
		},
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		data: {
			test: 1
		},
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		slug: 'hello'
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

ava('.query() should handle integer float limits', async (test) => {
	for (const index of _.range(0, 1000)) {
		await test.context.backend.insertElement(test.context.context, {
			type: 'card@1.0.0',
			slug: `foo-${index}`,
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {
				test: index
			}
		})
	}

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 15.0
	})

	test.is(results.length, 15)
})

ava('.query() should throw given float limits', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 59.8
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should apply a maximum limit by default', async (test) => {
	for (const index of _.range(0, 1100)) {
		await test.context.backend.insertElement(test.context.context, {
			type: 'card@1.0.0',
			slug: `foo-${index}`,
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {
				test: index
			}
		})
	}

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	})

	test.is(results.length, 1000)
})

ava('.query() return nothing given a zero limit', async (test) => {
	for (const index of _.range(0, 1000)) {
		await test.context.backend.insertElement(test.context.context, {
			type: 'card@1.0.0',
			slug: `foo-${index}`,
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {
				test: index
			}
		})
	}

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 0
	})

	test.is(results.length, 0)
})

ava('.query() should apply a maximum limit by default given sortBy', async (test) => {
	for (const index of _.range(0, 1100)) {
		await test.context.backend.insertElement(test.context.context, {
			type: 'card@1.0.0',
			slug: `foo-${index}`,
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {
				test: index
			}
		})
	}

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'created_at'
	})

	test.is(results.length, 1000)
})

ava('.query() should throw if limit is negative', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: -1
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should throw if limit is too large', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 3000
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should throw if limit is Infinity', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: Infinity
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should throw if limit is -Infinity', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: -Infinity
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should throw if limit is NaN', async (test) => {
	await test.throwsAsync(test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		limit: NaN
	}), {
		instanceOf: errors.JellyfishInvalidLimit
	})
})

ava('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	// To ensure the created_at dates are different
	await Bluebird.delay(10)

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'bar',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	// To ensure the created_at dates are different
	await Bluebird.delay(10)

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'baz',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'created_at',
		limit: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result1, result2 ])
})

ava('.query() should be able to skip the results', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	// To ensure the created_at dates are different
	await Bluebird.delay(10)

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'bar',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	// To ensure the created_at dates are different
	await Bluebird.delay(10)

	const result3 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'baz',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'created_at',
		skip: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result3 ])
})

ava('.query() should be able to skip the results of a one-element query', async (test) => {
	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'foo',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
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
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
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
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			test: 1,
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
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
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
		type: 'card@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'bar',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'card@1.0.0',
		slug: 'baz',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		skip: 1,
		limit: 1
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result2 ])
})

ava('.query() should be able to sort the query using a key', async (test) => {
	const card1 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		name: 'd',
		active: true,
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card@1.0.0',
		active: true,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card@1.0.0',
		links: {},
		active: true,
		version: '1.0.0',
		tags: [],
		linked_at: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		name: 'b',
		data: {}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'card@1.0.0'
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
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card@1.0.0',
		links: {},
		linked_at: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
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
				const: 'card@1.0.0'
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
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			code: 'd'
		}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
		active: true,
		data: {
			code: 'a'
		}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			code: 'c'
		}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
				const: 'card@1.0.0'
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
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'd',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
		active: true,
		name: 'a',
		data: {}
	})

	const card3 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
		active: true,
		name: 'c',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
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
				const: 'card@1.0.0'
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
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'd',
		data: {}
	})

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'a',
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'c',
		data: {}
	})

	const card4 = await test.context.backend.upsertElement(test.context.context, {
		slug: 'qux',
		type: 'card@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'name',
		limit: 2
	})

	test.deepEqual(results, [ card2, card4 ])
})

ava('.query() should escape malicious sortBy statements', async (test) => {
	const injection = 'created_at; DROP TABLE cards; --'
	const error = await test.throwsAsync(() => {
		return test.context.backend.query(test.context.context, {
			type: 'object',
			additionalProperties: true,
			properties: {
				type: {
					type: 'string',
					const: 'card@1.0.0'
				}
			},
			required: [ 'type' ]
		}, {
			sortBy: [ injection ]
		})
	})

	test.is(error.message, `column cards.${injection} does not exist`)
})

ava('.query() should correctly honour top level additionalProperties: true', async (test) => {
	const user1 = await test.context.backend.insertElement(test.context.context, {
		slug: 'user-johndoe',
		version: '1.0.0',
		links: {},
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		type: 'user@1.0.0'
	})

	const user2 = await test.context.backend.insertElement(test.context.context, {
		slug: 'user-janedoe',
		active: true,
		links: {},
		version: '1.0.0',
		tags: [],
		data: {},
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		type: 'user@1.0.0'
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
				const: 'user@1.0.0'
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
				const: 'user@1.0.0'
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
				const: 'user@1.0.0'
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
				const: 'user@1.0.0'
			}
		}
	})

	test.deepEqual(_.sortBy(results1, 'slug'), [
		{
			type: 'user@1.0.0'
		},
		{
			type: 'user@1.0.0'
		}
	])
	test.deepEqual(_.sortBy(results2, 'slug'), [ user2, user1 ])
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
			type: 'user@1.0.0'
		},
		{
			type: 'user@1.0.0'
		}
	])
})

ava('.query() should resolve "limit" after resolving links', async (test) => {
	await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'foo',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
		active: true,
		data: {}
	})

	const thread2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'bar',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'qux',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			payload: 'foo',
			count: 1
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card1.slug}-is-attached-to-${thread2.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
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
				const: 'thread@1.0.0'
			}
		}
	}, {
		limit: 1
	})

	test.deepEqual(results, [
		{
			id: thread2.id,
			active: true,
			capabilities: [],
			created_at: thread2.created_at,
			updated_at: thread2.updated_at,
			linked_at: {
				'has attached element': link.created_at
			},
			markers: [],
			name: null,
			requires: [],
			tags: [],
			version: '1.0.0',
			type: thread2.type,
			slug: thread2.slug,
			links: results[0].links,
			data: {}
		}
	])
})

ava('adding a link should update the linked_at field', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'foo',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'qux',
		links: {},
		active: true,
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		linked_at: {},
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		data: {}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card.slug}-is-attached-to-${thread.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
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

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: thread.id
			}
		},
		additionalProperties: true
	})

	test.deepEqual(results[0], {
		active: true,
		capabilities: [],
		created_at: thread.created_at,
		data: {},
		id: thread.id,
		linked_at: {
			'has attached element': link.created_at
		},
		links: results[0].links,
		markers: [],
		name: null,
		requires: [],
		slug: thread.slug,
		tags: [],
		type: thread.type,
		updated_at: thread.updated_at,
		version: '1.0.0'
	})

	const results2 = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: card.id
			}
		},
		additionalProperties: true
	})

	test.deepEqual(results2[0], {
		active: true,
		capabilities: [],
		created_at: card.created_at,
		data: {},
		id: card.id,
		linked_at: {
			'is attached to': link.created_at
		},
		links: results2[0].links,
		markers: [],
		name: null,
		requires: [],
		slug: card.slug,
		tags: [],
		type: card.type,
		updated_at: card.updated_at,
		version: '1.0.0'
	})
})

ava('adding a link should augment an existing linked_at field', async (test) => {
	const thread = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'foo',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const card = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'qux',
		links: {},
		active: true,
		version: '1.0.0',
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		data: {}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card.slug}-is-attached-to-${thread.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
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

	const card2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'qux',
		links: {},
		active: true,
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		data: {}
	})

	const link2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card2.slug}-is-attached-to-${thread.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		name: 'card belongs to thread',
		data: {
			inverseName: 'thread has card',
			from: {
				id: card2.id,
				type: card2.type
			},
			to: {
				id: thread.id,
				type: thread.type
			}
		}
	})

	const results = await test.context.backend.query(test.context.context, {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				const: thread.id
			}
		},
		additionalProperties: true
	})

	test.deepEqual(results[0], {
		active: true,
		capabilities: [],
		created_at: thread.created_at,
		data: {},
		id: thread.id,
		linked_at: {
			'has attached element': link.created_at,
			'thread has card': link2.created_at
		},
		links: results[0].links,
		markers: [],
		name: null,
		requires: [],
		slug: thread.slug,
		tags: [],
		type: thread.type,
		updated_at: thread.updated_at,
		version: '1.0.0'
	})
})

ava('.query() should be able to query using links', async (test) => {
	const thread1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'foo',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {}
	})

	const thread2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'bar',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'thread@1.0.0',
		slug: 'baz',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'qux',
		links: {},
		active: true,
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		data: {
			payload: 'foo',
			count: 1
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card1.slug}-is-attached-to-${thread1.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
		type: 'message@1.0.0',
		slug: 'tux',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'bar',
			count: 2
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card2.slug}-is-attached-to-${thread1.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
		type: 'message@1.0.0',
		slug: 'fux',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'baz',
			count: 3
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card3.slug}-is-attached-to-${thread2.slug}`,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
						const: 'thread@1.0.0'
					}
				},
				additionalProperties: false
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'message@1.0.0'
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
	}, {
		sortBy: [ 'data', 'count' ]
	})

	test.deepEqual(results, [
		{
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						id: thread1.id,
						type: 'thread@1.0.0'
					}
				]
			},
			data: {
				count: 1,
				payload: 'foo'
			}
		},
		{
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						id: thread1.id,
						type: 'thread@1.0.0'
					}
				]
			},
			data: {
				count: 2,
				payload: 'bar'
			}
		},
		{
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						id: thread2.id,
						type: 'thread@1.0.0'
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
		type: 'thread@1.0.0',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		slug: 'foo',
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		links: {},
		slug: 'bar',
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
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
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						active: true,
						name: null,
						slug: 'foo',
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						created_at: thread.created_at,
						updated_at: thread.updated_at,
						linked_at: {
							'has attached element': link.created_at
						},
						markers: [],
						requires: [],
						tags: [],
						version: '1.0.0',
						capabilities: [],
						id: thread.id,
						links: results[0].links['is attached to'][0].links,
						type: 'thread@1.0.0'
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
		type: 'thread@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message = await test.context.backend.upsertElement(test.context.context, {
		slug: 'message-foobar',
		type: 'message@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${message.slug}-is-attached-to-${thread.slug}`,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		linked_at: {},
		updated_at: null,
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
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						slug: 'foo',
						active: true,
						name: null,
						data: {
							description: 'lorem ipsum dolor sit amet'
						},
						id: thread.id,
						created_at: thread.created_at,
						updated_at: thread.updated_at,
						linked_at: {
							'has attached element': link.created_at
						},
						capabilities: [],
						markers: [],
						requires: [],
						tags: [],
						version: '1.0.0',
						links: results[0].links['is attached to'][0].links,
						type: 'thread@1.0.0'
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
		type: 'thread@1.0.0',
		slug: 'mythread',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			description: 'lorem ipsum dolor sit amet'
		}
	})

	const message1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const message2 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'bar',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'bar'
		}
	})

	const link1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${message1.slug}-is-attached-to-${thread.slug}`,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
		type: 'link@1.0.0',
		slug: `link-${message2.slug}-is-attached-to-${thread.slug}`,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
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

	results[0].links['has attached element'].sort((cardA, cardB) => {
		if (cardA.slug > cardB.slug) {
			return -1
		} else if (cardA.slug === cardB.slug) {
			return 0
		}
		return 1
	})

	test.deepEqual(results, [
		{
			id: thread.id,
			type: 'thread@1.0.0',
			links: {
				'has attached element': [
					{
						active: true,
						slug: 'foo',
						id: message1.id,
						name: null,
						created_at: message1.created_at,
						updated_at: message1.updated_at,
						linked_at: {
							'is attached to': link1.created_at
						},
						capabilities: [],
						markers: [],
						requires: [],
						tags: [],
						version: '1.0.0',
						links: results[0].links['has attached element'][0].links,
						type: 'message@1.0.0',
						data: {
							payload: 'foo'
						}
					},
					{
						active: true,
						slug: 'bar',
						id: message2.id,
						name: null,
						created_at: message2.created_at,
						updated_at: message2.updated_at,
						linked_at: {
							'is attached to': link2.created_at
						},
						capabilities: [],
						markers: [],
						requires: [],
						tags: [],
						version: '1.0.0',
						links: results[0].links['has attached element'][1].links,
						type: 'message@1.0.0',
						data: {
							payload: 'bar'
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
		type: 'thread@1.0.0',
		slug: 'mythread',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const foo = await test.context.backend.upsertElement(test.context.context, {
		type: 'foo@1.0.0',
		slug: 'foo',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {}
	})

	const card1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'message@1.0.0',
		slug: 'bar',
		version: '1.0.0',
		tags: [],
		links: {},
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {
			payload: 'foo'
		}
	})

	const link1 = await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card1.slug}-is-attached-to-${thread.slug}`,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
		type: 'message@1.0.0',
		slug: 'baz',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		data: {
			payload: 'bar'
		}
	})

	await test.context.backend.upsertElement(test.context.context, {
		type: 'link@1.0.0',
		slug: `link-${card2.slug}-is-attached-to-${foo.slug}`,
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
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
						const: 'thread@1.0.0'
					}
				}
			}
		},
		properties: {
			type: {
				type: 'string',
				const: 'message@1.0.0'
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
			type: 'message@1.0.0',
			links: {
				'is attached to': [
					{
						active: true,
						data: {},
						name: null,
						id: thread.id,
						created_at: thread.created_at,
						updated_at: thread.updated_at,
						linked_at: {
							'has attached element': link1.created_at
						},
						capabilities: [],
						markers: [],
						requires: [],
						tags: [],
						version: '1.0.0',
						links: results[0].links['is attached to'][0].links,
						slug: 'mythread',
						type: 'thread@1.0.0'
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
				const: 'foo@1.0.0'
			},
			data: {
				type: 'object',
				required: [ 'test' ],
				properties: {
					test: {
						type: 'number'
					}
				}
			}
		},
		required: [ 'type' ]
	}).then(async (emitter) => {
		emitter.on('data', (change) => {
			test.is(change.type, 'insert')
			test.is(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'foo@1.0.0',
				data: {
					test: 1
				}
			})

			emitter.close()
		})

		let promise = Promise.resolve()

		emitter.on('error', (error) => {
			promise.then(() => {
				test.end(error)
			}).catch(test.end)
		})

		emitter.on('closed', () => {
			promise.then(() => {
				test.end()
			}).catch(test.end)
		})

		promise = Bluebird.all([
			test.context.backend.insertElement(test.context.context, {
				type: 'foo@1.0.0',
				version: '1.0.0',
				tags: [],
				links: {},
				markers: [],
				requires: [],
				capabilities: [],
				linked_at: {},
				created_at: new Date().toISOString(),
				updated_at: null,
				active: true,
				slug: 'foo',
				data: {
					test: 1
				}
			}),
			test.context.backend.insertElement(test.context.context, {
				type: 'bar@1.0.0',
				version: '1.0.0',
				tags: [],
				links: {},
				markers: [],
				requires: [],
				capabilities: [],
				created_at: new Date().toISOString(),
				updated_at: null,
				linked_at: {},
				active: true,
				slug: 'bar',
				data: {
					test: 3
				}
			})
		])
	}).catch(test.end)
})

ava.cb('.stream() should report back changes to certain elements', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo@1.0.0',
		version: '1.0.0',
		links: {},
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		active: true,
		slug: 'hello',
		data: {
			test: 1
		}
	}).then(() => {
		return test.context.backend.insertElement(test.context.context, {
			type: 'bar@1.0.0',
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			linked_at: {},
			active: true,
			slug: 'qux',
			data: {
				test: 1
			}
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
					const: 'foo@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'test' ],
					properties: {
						test: {
							type: 'number'
						}
					}
				}
			},
			required: [ 'type' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			if (change.type === 'insert') {
				return
			}

			test.is(change.type, 'update')
			test.deepEqual(_.omit(change.before, [ 'id' ]), {
				slug: 'hello',
				type: 'foo@1.0.0',
				data: {
					test: 1
				}
			})

			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo@1.0.0',
				data: {
					test: 2
				}
			})

			emitter.close()
		})

		let promise = Promise.resolve()

		emitter.on('error', (error) => {
			promise.then(() => {
				test.end(error)
			}).catch(test.end)
		})

		emitter.on('closed', () => {
			promise.then(() => {
				test.end()
			}).catch(test.end)
		})

		promise = test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			linked_at: {},
			active: true,
			type: 'foo@1.0.0',
			data: {
				test: 2
			}
		}).then(() => {
			return test.context.backend.upsertElement(test.context.context, {
				slug: 'qux',
				active: true,
				version: '1.0.0',
				links: {},
				tags: [],
				markers: [],
				requires: [],
				capabilities: [],
				created_at: new Date().toISOString(),
				updated_at: null,
				linked_at: {},
				type: 'bar@1.0.0',
				data: {
					test: 2
				}
			})
		})
	}).catch(test.end)
})

ava.cb('.stream() should report back changes to large elements', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo@1.0.0',
		active: true,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		slug: 'hello',
		data: {
			test: new Array(5000).join('foobar')
		}
	}).then(() => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'test' ],
					properties: {
						test: {
							type: 'string'
						}
					}
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
					type: 'foo@1.0.0',
					data: {
						test: new Array(5000).join('foobar')
					}
				})) {
				return
			}

			test.is(change.type, 'update')
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo@1.0.0',
				data: {
					test: new Array(5000).join('bazbuzz')
				}
			})

			emitter.close()
		})

		let promise = Promise.resolve()

		emitter.on('error', (error) => {
			promise.then(() => {
				test.end(error)
			}).catch(test.end)
		})

		emitter.on('closed', () => {
			promise.then(() => {
				test.end()
			}).catch(test.end)
		})

		promise = test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			active: true,
			version: '1.0.0',
			links: {},
			tags: [],
			markers: [],
			requires: [],
			capabilities: [],
			linked_at: {},
			created_at: new Date().toISOString(),
			updated_at: null,
			type: 'foo@1.0.0',
			data: {
				test: new Array(5000).join('bazbuzz')
			}
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
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		linked_at: {},
		type: 'foo@1.0.0',
		data: {
			test: '1'
		}
	}).then((emitter) => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'test' ],
					properties: {
						test: {
							type: 'number'
						}
					}
				}
			},
			required: [ 'slug', 'type', 'data' ]
		})
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'foobarbaz',
				type: 'foo@1.0.0',
				data: {
					test: 1
				}
			})

			emitter.close()
		})

		let promise = Promise.resolve()

		emitter.on('error', (error) => {
			promise.then(() => {
				test.end(error)
			}).catch(test.end)
		})

		emitter.on('closed', () => {
			promise.then(() => {
				test.end()
			}).catch(test.end)
		})

		promise = test.context.backend.upsertElement(test.context.context, {
			slug: 'foobarbaz',
			active: true,
			links: {},
			version: '1.0.0',
			tags: [],
			markers: [],
			requires: [],
			capabilities: [],
			linked_at: {},
			created_at: new Date().toISOString(),
			updated_at: null,
			type: 'foo@1.0.0',
			data: {
				test: 1
			}
		})
	}).catch(test.end)
})

ava.cb('.stream() should filter the "before" section of a change', (test) => {
	test.context.backend.insertElement(test.context.context, {
		type: 'foo@1.0.0',
		active: true,
		links: {},
		version: '1.0.0',
		tags: [],
		markers: [],
		requires: [],
		capabilities: [],
		linked_at: {},
		created_at: new Date().toISOString(),
		updated_at: null,
		slug: 'hello',
		data: {
			test: 1,
			extra: true
		}
	}).then(() => {
		return test.context.backend.stream(test.context.context, {
			type: 'object',
			properties: {
				slug: {
					type: 'string'
				},
				type: {
					type: 'string',
					const: 'foo@1.0.0'
				},
				data: {
					type: 'object',
					required: [ 'test' ],
					additionalProperties: false,
					properties: {
						test: {
							type: 'number'
						}
					}
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
					type: 'foo@1.0.0',
					slug: 'hello',
					data: {
						test: 1
					}
				})) {
				return
			}

			test.deepEqual(_.omit(change.before, [ 'id' ]), {
				slug: 'hello',
				type: 'foo@1.0.0',
				data: {
					test: 1
				}
			})

			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug: 'hello',
				type: 'foo@1.0.0',
				data: {
					test: 2
				}
			})

			emitter.close()
		})

		let promise = Promise.resolve()

		emitter.on('error', (error) => {
			promise.then(() => {
				test.end(error)
			}).catch(test.end)
		})

		emitter.on('closed', () => {
			promise.then(() => {
				test.end()
			}).catch(test.end)
		})

		promise = test.context.backend.upsertElement(test.context.context, {
			slug: 'hello',
			version: '1.0.0',
			tags: [],
			links: {},
			markers: [],
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			linked_at: {},
			updated_at: null,
			active: true,
			type: 'foo@1.0.0',
			data: {
				test: 2,
				extra: true
			}
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
			version: '1.0.0',
			links: {},
			tags: [],
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			type: 'stress-test@1.0.0',
			data: {
				time
			}
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
			links: {},
			type: 'stress-test@1.0.0',
			version: '1.0.0',
			tags: [],
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {
				time
			}
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
