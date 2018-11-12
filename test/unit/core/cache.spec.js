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
const helpers = require('./helpers')

ava.test.afterEach(helpers.cache.afterEach)
ava.test.beforeEach(helpers.cache.beforeEach)

ava.test('.set() should be able to retrieve item by id', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)

	const el = await test.context.cache.getById('test', element1.id)

	test.deepEqual(element1, el.element)
})

ava.test('.set() should be able to retrieve item by slug', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)

	const el = await test.context.cache.getBySlug('test', element1.slug)

	test.deepEqual(element1, el.element)
})

ava.test('.setMissingId() should prevent card from being fetched by ID', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.setMissingId('test', element1.id)
	const el = await test.context.cache.getById('test', element1.id)

	test.truthy(el.hit)
	test.falsy(el.element)
})

ava.test('.setMissingSlug() should prevent card from being fetched by slug', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.setMissingSlug('test', element1.slug)
	const el = await test.context.cache.getBySlug('test', element1.slug)

	test.truthy(el.hit)
	test.falsy(el.element)
})

ava.test('.getById() should get the correct element', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	const el1 = await test.context.cache.getById('test', element1.id)
	const el2 = await test.context.cache.getById('test', element2.id)

	test.deepEqual(element1, el1.element)
	test.deepEqual(element2, el2.element)
})

ava.test('.getBySlug() should get the correct element', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	const el1 = await test.context.cache.getBySlug('test', element1.slug)
	const el2 = await test.context.cache.getBySlug('test', element2.slug)

	test.deepEqual(element1, el1.element)
	test.deepEqual(element2, el2.element)
})

ava.test('.unset() should remove an element from the cache', async (test) => {
	const element1 = {
		id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test1'
	}

	const element2 = {
		id: '5a962ad9-20b5-4dd8-a707-bf819593cc84',
		slug: 'test2'
	}

	await test.context.cache.set('test', element1)
	await test.context.cache.set('test', element2)

	await test.context.cache.unset(element1)
	const el1 = await test.context.cache.getBySlug('test', element1.slug)
	const el2 = await test.context.cache.getBySlug('test', element2.slug)

	test.deepEqual(undefined, el1.element)
	test.deepEqual(element2, el2.element)
})
