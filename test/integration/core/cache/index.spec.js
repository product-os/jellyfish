/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')

ava.afterEach(helpers.afterEach)
ava.beforeEach(helpers.beforeEach)

ava('.set() should be able to retrieve item by id', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)

	const el = await test.context.cache.getById('test', element1.id)

	test.deepEqual(element1, el.element)
})

ava('.set() should be able to retrieve item by slug', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)

	const el = await test.context.cache.getBySlug(
		'test', element1.slug, element1.version)

	test.deepEqual(element1, el.element)
})

ava('.set() should not be able to retrieve item by slug given the wrong version', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)

	const el = await test.context.cache.getBySlug(
		'test', element1.slug, '2.0.0')

	test.falsy(el.hit)
	test.falsy(el.element)
})

ava('.setMissingId() should prevent card from being fetched by ID', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.setMissingId('test', element1.id)
	const el = await test.context.cache.getById('test', element1.id)

	test.truthy(el.hit)
	test.falsy(el.element)
})

ava('.setMissingSlug() should prevent card from being fetched by slug', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.setMissingSlug(
		'test', element1.slug, element1.version)
	const el = await test.context.cache.getBySlug(
		'test', element1.slug, element1.version)

	test.truthy(el.hit)
	test.falsy(el.element)
})

ava('.setMissingSlug() should not prevent other versions from being fetched by slug', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test'
	}

	const element2 = {
		id: '9af7cf33-1a29-4f0c-a73b-f6a2b149850c',
		version: '1.0.1',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)
	await test.context.cache.setMissingSlug(
		'test', element1.slug, element1.version)

	const result1 = await test.context.cache.getBySlug(
		'test', element2.slug, element2.version)
	test.truthy(result1.hit)
	test.deepEqual(result1.element, element2)

	const result2 = await test.context.cache.getBySlug(
		'test', element1.slug, element1.version)
	test.truthy(result2.hit)
	test.falsy(result2.element)
})

ava('.getById() should get the correct element', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	const el1 = await test.context.cache.getById('test', element1.id)
	const el2 = await test.context.cache.getById('test', element2.id)

	test.deepEqual(element1, el1.element)
	test.deepEqual(element2, el2.element)
})

ava('.getBySlug() should get the correct element', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	const el1 = await test.context.cache.getBySlug(
		'test', element1.slug, element1.version)
	const el2 = await test.context.cache.getBySlug(
		'test', element2.slug, element2.version)

	test.deepEqual(element1, el1.element)
	test.deepEqual(element2, el2.element)
})

ava('.unset() should remove an element from the cache', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		version: '1.0.0',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	await test.context.cache.unset(element1)
	const el1 = await test.context.cache.getBySlug(
		'test', element1.slug, element1.version)
	const el2 = await test.context.cache.getBySlug(
		'test', element2.slug, element2.version)

	test.deepEqual(undefined, el1.element)
	test.deepEqual(element2, el2.element)
})
