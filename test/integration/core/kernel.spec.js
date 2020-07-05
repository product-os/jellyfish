/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const {
	v4: uuid
} = require('uuid')
const errors = require('../../../lib/core/errors')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

const context = {
	context: {}
}

ava.serial.before(async () => {
	return helpers.before({
		context
	})
})

ava.serial.after(async () => {
	return helpers.after({
		context
	})
})

ava('should only expose the required methods', (test) => {
	const methods = Object.getOwnPropertyNames(
		Reflect.getPrototypeOf(context.kernel))

	/*
	 * Think very hard before extending this interface, as its
	 * very easy to add cruft over time that will get abused.
	 * All private methods should remain private.
	 */
	test.deepEqual(methods, [
		'constructor',
		'disconnect',
		'initialize',
		'getCardById',
		'getCardBySlug',
		'insertCard',
		'replaceCard',
		'patchCardBySlug',
		'query',
		'stream',
		'defaults',
		'getStatus'
	])
})

for (const key in CARDS) {
	ava(`should contain the ${key} card by default`, async (test) => {
		const card = await CARDS[key]
		card.name = _.isString(card.name) ? card.name : null
		const element = await context.kernel.getCardBySlug(
			context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`)
		test.deepEqual(card, _.omit(element, [ 'created_at', 'id', 'updated_at', 'linked_at' ]))
	})
}

ava('.patchCardBySlug() should throw an error if the element does not exist', async (test) => {
	const slug = `${context.generateRandomSlug({
		prefix: 'foobarbaz'
	})}@1.0.0`
	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, slug, [
			{
				op: 'replace',
				path: '/active',
				value: false
			}
		], {
			type: 'card@1.0.0'
		}), {
		instanceOf: errors.JellyfishNoElement
	})
})

ava('.patchCardBySlug() should apply a single operation', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await context.kernel.patchCardBySlug(
		context.context,
		context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 'baz'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context,
		context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, {
		id: card.id,
		active: true,
		name: null,
		capabilities: [],
		created_at: card.created_at,
		linked_at: card.linked_at,
		links: card.links,
		markers: card.markers,
		requires: card.requires,
		slug,
		updated_at: result.updated_at,
		tags: [],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'baz'
		}
	})
})

ava('.patchCardBySlug() should add an element to an array', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await context.kernel.patchCardBySlug(
		context.context,
		context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/markers/0',
				value: 'test'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, {
		id: card.id,
		active: true,
		name: null,
		capabilities: [],
		created_at: card.created_at,
		linked_at: card.linked_at,
		links: {},
		markers: [ 'test' ],
		requires: [],
		slug,
		updated_at: result.updated_at,
		tags: [],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})
})

ava('.patchCardBySlug() should delete a property inside data', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar',
				bar: 'baz'
			}
		})

	await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/data/foo'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, {
		id: card.id,
		active: true,
		name: null,
		capabilities: [],
		created_at: card.created_at,
		linked_at: card.linked_at,
		links: card.links,
		markers: card.markers,
		requires: card.requires,
		slug,
		updated_at: result.updated_at,
		tags: [],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			bar: 'baz'
		}
	})
})

ava('.patchCardBySlug() should apply more than one operation', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/data/foo',
				value: {}
			},
			{
				op: 'add',
				path: '/data/foo/bar',
				value: 'baz'
			},
			{
				op: 'add',
				path: '/data/foo/qux',
				value: 1
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, {
		id: card.id,
		active: true,
		name: null,
		capabilities: [],
		created_at: card.created_at,
		linked_at: card.linked_at,
		links: card.links,
		markers: card.markers,
		requires: card.requires,
		slug,
		updated_at: result.updated_at,
		tags: [],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: {
				qux: 1,
				bar: 'baz'
			}
		}
	})
})

ava('.patchCardBySlug() should not be able to delete an id', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/id'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not be able to delete a top level property', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/tags'
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw given an operation without a path', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				value: 'foo'
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishInvalidPatch
	})
})

ava('.patchCardBySlug() should throw if the patch does not match', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'delete',
				path: '/data/hello'
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw if adding to non existent property', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/data/hello/world',
				value: 1
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishInvalidPatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw given an invalid operation', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'bar',
				path: '/data/foo',
				value: 1
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishInvalidPatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not apply half matching patches', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/data/test',
				value: 2
			},
			{
				op: 'add',
				path: '/data/hello/world',
				value: 1
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishInvalidPatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not break the type schema', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-john-doe'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/data/roles'
			}
		], {
			type: card.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should apply a no-op patch', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 'bar'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should apply an empty set of patches', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should ignore changes to read-only properties', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foobarbaz'
	})
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await context.kernel.patchCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/links/foo',
				value: 'bar'
			},
			{
				op: 'replace',
				path: '/created_at',
				value: new Date().toISOString()
			},
			{
				op: 'add',
				path: '/linked_at/foo',
				value: 'bar'
			}
		], {
			type: card.type
		})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should be able to patch cards hidden to the user', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				properties: {
					slug: {
						type: 'string',
						const: [ 'user', 'type' ]
					},
					type: {
						type: 'string',
						const: 'type@1.0.0'
					},
					data: {
						type: 'object',
						additionalProperties: true
					}
				},
				required: [ 'slug', 'type', 'data' ]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	test.falsy(await context.kernel.getCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		}))

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'add',
				path: '/data/foo',
				value: 'bar'
			}
		], {
			type: userCard.type
		}), {
		instanceOf: errors.JellyfishNoElement
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not allow updates in hidden fields', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user@1.0.0'
							},
							data: {
								type: 'object',
								required: [ 'email' ],
								additionalProperties: false,
								properties: {
									email: {
										type: 'string'
									}
								}
							}
						}
					},
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string',
								enum: [ 'user', 'type' ]
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						}
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await context.kernel.getCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`)

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'replace',
				path: '/data/roles',
				value: [ 'admin' ]
			}
		], {
			type: userCard.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not return the full card', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user@1.0.0'
							},
							data: {
								type: 'object',
								required: [ 'email' ],
								additionalProperties: false,
								properties: {
									email: {
										type: 'string'
									}
								}
							}
						}
					},
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string',
								enum: [ 'user', 'type' ]
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						}
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await context.kernel.getCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	const patched = await context.kernel.patchCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'replace',
				path: '/data/email',
				value: 'johndoe@gmail.com'
			}
		], {
			type: userCard.type
		})

	test.deepEqual(patched.data, {
		email: 'johndoe@gmail.com'
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result.data, {
		email: 'johndoe@gmail.com',
		hash: 'secret',
		roles: []
	})
})

ava('.patchCardBySlug() should not allow a patch that makes a card inaccessible', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						required: [ 'data' ],
						additionalProperties: true,
						properties: {
							data: {
								type: 'object',
								required: [ 'foo' ],
								additionalProperties: true,
								properties: {
									foo: {
										type: 'number',
										const: 7
									}
								}
							}
						}
					},
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string',
								enum: [ 'card', 'user', 'type' ]
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						}
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const randomCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'random-1'
			}),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				hello: 'world',
				foo: 7
			}
		})

	const filteredCard = await context.kernel.getCardBySlug(
		context.context, session.id, `${randomCard.slug}@${randomCard.version}`, {
			type: randomCard.type
		})

	test.deepEqual(filteredCard, randomCard)

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, session.id, `${randomCard.slug}@${randomCard.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 8
			}
		], {
			type: randomCard.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${randomCard.slug}@${randomCard.version}`, {
			type: randomCard.type
		})

	test.deepEqual(result, randomCard)
})

ava('.patchCardBySlug() should not remove inaccessible fields', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user@1.0.0'
							},
							data: {
								type: 'object',
								required: [ 'email' ],
								additionalProperties: false,
								properties: {
									email: {
										type: 'string'
									}
								}
							}
						}
					},
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string',
								enum: [ 'user', 'type' ]
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						}
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await context.kernel.getCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'remove',
				path: '/data/hash'
			}
		], {
			type: userCard.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not add an inaccesible field', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user@1.0.0'
							},
							data: {
								type: 'object',
								required: [ 'email' ],
								additionalProperties: false,
								properties: {
									email: {
										type: 'string'
									}
								}
							}
						}
					},
					{
						required: [ 'slug', 'type', 'data' ],
						properties: {
							slug: {
								type: 'string',
								enum: [ 'user', 'type' ]
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								additionalProperties: true
							}
						}
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await context.kernel.getCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(context.kernel.patchCardBySlug(
		context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'add',
				path: '/data/special',
				value: 7
			}
		], {
			type: userCard.type
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})

	const result = await context.kernel.getCardBySlug(
		context.context,
		context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.insertCard() should throw an error if the element is not a valid card', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		hello: 'world'
	}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: 'action-foo-bar',
		type: 'action@1.0.0',
		version: '1.0.0',
		data: {}
	}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should throw an error if the slug contains @latest', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: 'test-1@latest',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should throw an error if the slug contains a version', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: 'test-1@1.0.0',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'foobarbazqux@1.0.0',
		version: '1.0.0',
		active: true,
		data: {}
	}), {
		instanceOf: errors.JellyfishUnknownCardType
	})
})

ava('.insertCard() should be able to insert two versions of the same card', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})

	const card1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const card2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'card@1.0.0',
			version: '1.0.1',
			data: {
				foo: 'baz'
			}
		})

	test.is(card1.slug, card2.slug)

	const element1 = await context.kernel.getCardBySlug(
		context.context,
		context.kernel.sessions.admin,
		`${card1.slug}@1.0.0`)
	test.is(element1.data.foo, 'bar')

	const element2 = await context.kernel.getCardBySlug(
		context.context,
		context.kernel.sessions.admin,
		`${card1.slug}@1.0.1`)
	test.is(element2.data.foo, 'baz')

	test.deepEqual(element1, card1)
	test.deepEqual(element2, card2)
})

ava('.insertCard() should be able to insert a card', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should be able to set a tag with a colon', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		tags: [ 'foo:bar' ],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should be able to set a tag with a space and a slash', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		tags: [ 'CUSTOM HARDWARE/OS' ],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should use defaults if required keys are missing', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		type: 'card@1.0.0'
	})

	test.deepEqual(card, {
		id: card.id,
		created_at: card.created_at,
		updated_at: null,
		linked_at: {},
		slug,
		type: 'card@1.0.0',
		name: null,
		active: true,
		version: '1.0.0',
		tags: [],
		markers: [],
		links: {},
		requires: [],
		capabilities: [],
		data: {}
	})
})

ava('.insertCard() should throw if the card already exists', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'hello-world'
	})
	const card = {
		slug,
		type: 'card@1.0.0'
	}

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, card)
	await test.throwsAsync(context.kernel.insertCard(context.context,
		context.kernel.sessions.admin,
		card
	), {
		instanceOf: errors.JellyfishElementAlreadyExists
	})
})

ava('.replaceCard() should replace an element', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'foo-bar'
	})
	const card1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const card2 = await context.kernel.replaceCard(context.context, context.kernel.sessions.admin, {
		slug,
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	test.is(card1.id, card2.id)
	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, card1.id)
	test.deepEqual(element, card2)
})

ava('.insertCard() should be able to create a link between two valid cards', async (test) => {
	const card1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'foo-bar'
		}),
		type: 'card@1.0.0'
	})

	const card2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'bar-baz'
		}),
		type: 'card@1.0.0'
	})

	const linkCard = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link@1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: card2.id,
				type: card2.type
			}
		}
	})

	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
})

ava('.insertCard() should be able to create a direction-less link between two valid cards', async (test) => {
	const card1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'foo-bar'
		}),
		type: 'card@1.0.0'
	})

	const card2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'bar-baz'
		}),
		type: 'card@1.0.0'
	})

	const linkCard = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `link-${card1.slug}-is-linked-to-${card2.slug}`,
		type: 'link@1.0.0',
		name: 'is linked to',
		data: {
			inverseName: 'is linked to',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: card2.id,
				type: card2.type
			}
		}
	})

	const element = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
	test.is(element.name, element.data.inverseName)
})

ava('.insertCard() should be able to create two different links between two valid cards', async (test) => {
	const card1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'foo-bar'
		}),
		type: 'card@1.0.0'
	})

	const card2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'bar-baz'
		}),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const linkCard1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `link-${card1.slug}-is-linked-to-${card2.slug}`,
		type: 'link@1.0.0',
		version: '1.0.0',
		name: 'is linked to',
		data: {
			inverseName: 'has been linked to',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: card2.id,
				type: card2.type
			}
		}
	})

	const linkCard2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
		type: 'link@1.0.0',
		version: '1.0.0',
		name: 'is attached to',
		data: {
			inverseName: 'has attached element',
			from: {
				id: card1.id,
				type: card1.type
			},
			to: {
				id: card2.id,
				type: card2.type
			}
		}
	})

	test.is(linkCard1.data.from.id, linkCard2.data.from.id)
	test.is(linkCard1.data.to.id, linkCard2.data.to.id)
})

ava('.insertCard() should not add a link if not inserting a card with a target', async (test) => {
	const card1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: card1.id
		}
	})

	const results = await context.kernel.query(context.context, context.kernel.sessions.admin, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'link'
			}
		}
	})

	test.deepEqual(results, [])
})

ava('.insertCard() read access on a property should not allow to write other properties', async (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'user-johndoe'
	})
	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${slug}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				anyOf: [
					{
						type: 'object',
						properties: {
							slug: {
								type: 'string',
								const: 'user'
							},
							type: {
								type: 'string',
								const: 'type@1.0.0'
							},
							data: {
								type: 'object',
								properties: {
									schema: {
										type: 'object',
										additionalProperties: true
									}
								},
								required: [ 'schema' ]
							}
						},
						additionalProperties: true,
						required: [ 'slug', 'type', 'data' ]
					},
					{
						type: 'object',
						properties: {
							id: {
								type: 'string'
							},
							type: {
								type: 'string',
								const: 'user@1.0.0'
							}
						},
						additionalProperties: false,
						required: [ 'id', 'type' ]
					}
				]
			}
		}
	})

	const userCard = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug,
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	})

	const targetUserCard = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'user-janedoe'
		}),
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'janedoe@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	})

	const session = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: userCard.id
		}
	})

	await test.throwsAsync(context.kernel.replaceCard(context.context, session.id, {
		id: targetUserCard.id,
		slug: targetUserCard.slug,
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'pwned@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	}), {
		instanceOf: errors.JellyfishPermissionsError
	})
})

ava('.replaceCard() should not overwrite the "created_at" field when overriding a card', async (test) => {
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await context.kernel.replaceCard(context.context, context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		created_at: new Date(633009018000).toISOString()
	})

	test.is(card.created_at, update.created_at)
})

ava('.replaceCard() should not overwrite the "linked_at" field when overriding a card', async (test) => {
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await context.kernel.replaceCard(context.context, context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		linked_at: {
			foo: 'bar'
		}
	})

	test.deepEqual(card.linked_at, update.linked_at)
})

ava('.insertCard() should not be able to set links', async (test) => {
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `card-${uuid()}`,
			type: 'card@1.0.0',
			links: {
				foo: 'bar'
			}
		})

	const element = await context.kernel.getCardById(
		context.context,
		context.kernel.sessions.admin,
		card.id)

	test.deepEqual(element.links, {})
})

ava('.replaceCard() should not be able to set links when overriding a card', async (test) => {
	const card = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await context.kernel.replaceCard(context.context, context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		links: {
			foo: 'bar'
		}
	})

	test.deepEqual(update.links, {})
})

ava('.getCardBySlug() there should be an admin card', async (test) => {
	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, 'user-admin@latest')
	test.truthy(card)
})

ava('.getCardById() should find an active card by its id', async (test) => {
	const result = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardById(
		context.context, context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.getCardById() should find an active card by its id and type', async (test) => {
	const result = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardById(
		context.context, context.kernel.sessions.admin, result.id)

	test.deepEqual(card, result)
})

ava('.getCardBySlug() should find an active card by its slug', async (test) => {
	const result = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${result.slug}@${result.version}`)
	test.deepEqual(card, result)
})

ava('.getCardBySlug() should not find an active card by its slug and the wrong version', async (test) => {
	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, 'foo-bar@1.0.1')

	test.falsy(card)
})

ava('.getCardBySlug() should not find an invalid slug when using @latest', async (test) => {
	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, 'foo-bar@latest')

	test.falsy(card)
})

ava('.getCardBySlug() should find an active card by its slug using @latest', async (test) => {
	const result = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${result.slug}@${result.version}`)

	test.deepEqual(card, result)
})

ava('.getCardBySlug() should find the latest version of a card', async (test) => {
	const slug = context.generateRandomSlug()

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const card2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'card@1.0.0',
			version: '2.0.1',
			data: {
				foo: 'baz'
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug,
			type: 'card@1.0.0',
			version: '1.2.1',
			data: {
				foo: 'qux'
			}
		})

	const element = await context.kernel.getCardBySlug(
		context.context,
		context.kernel.sessions.admin,
		`${slug}@latest`)

	test.is(element.data.foo, 'baz')
	test.deepEqual(element, card2)
})

ava('.getCardBySlug() should find an active card by its slug and its type', async (test) => {
	const result = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await context.kernel.getCardBySlug(
		context.context, context.kernel.sessions.admin, `${result.slug}@${result.version}`)

	test.deepEqual(card, result)
})

ava('.getCardById() should return an inactive card by its id', async (test) => {
	const result = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const card = await context.kernel.getCardById(context.context, context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.query() should throw an error given an invalid regex', async (test) => {
	await test.throwsAsync(context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'slug' ],
			properties: {
				slug: {
					type: 'string',
					pattern: '-(^[xx'
				}
			}
		}), {
		instanceOf: errors.JellyfishInvalidRegularExpression
	})
})

ava('.query() should throw an error given an invalid enum in links', async (test) => {
	await test.throwsAsync(context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			$$links: {
				'is member of': {
					type: 'object',
					properties: {
						slug: {
							enum: []
						}
					}
				}
			},
			type: 'object',
			properties: {
				type: {
					const: 'user@1.0.0'
				},
				slug: {
					pattern: '^user-admin'
				}
			},
			required: [ 'type', 'slug' ],
			additionalProperties: true
		}), {
		instanceOf: errors.JellyfishInvalidSchema
	})
})

ava('.query() should throw an error given an invalid enum', async (test) => {
	await test.throwsAsync(context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'slug' ],
			properties: {
				slug: {
					type: 'string',
					enum: []
				}
			}
		}), {
		instanceOf: errors.JellyfishInvalidSchema
	})
})

ava('.query() should be able to limit the results', async (test) => {
	const ref = uuid()
	const result1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await context.kernel.query(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			data: {
				type: 'object',
				properties: {
					ref: {
						type: 'string',
						const: ref
					}
				},
				required: [ 'ref' ]
			}
		},
		required: [ 'data' ]
	}, {
		sortBy: 'created_at',
		limit: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result1, result2 ])
})

ava('.query() should be able to skip the results', async (test) => {
	const ref = uuid()

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	const result3 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await context.kernel.query(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			data: {
				type: 'object',
				properties: {
					ref: {
						type: 'string',
						const: ref
					}
				},
				required: [ 'ref' ]
			}
		},
		required: [ 'data' ]
	}, {
		sortBy: 'created_at',
		skip: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result3 ])
})

ava('.query() should be able to limit and skip the results', async (test) => {
	const ref = uuid()

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			ref,
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await context.kernel.query(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			data: {
				type: 'object',
				properties: {
					ref: {
						type: 'string',
						const: ref
					}
				},
				required: [ 'ref' ]
			}
		},
		required: [ 'data' ]
	}, {
		sortBy: [ 'data', 'timestamp' ],
		limit: 1,
		skip: 1
	})

	test.deepEqual(results, [ result2 ])
})

ava('.query() should be able to sort linked cards', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0'
		})

	const child1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 1
			}
		})

	const child2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 0
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child1.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child1.id,
					type: child1.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child2.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child2.id,
					type: child2.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			$$links: {
				'has child': true
			},
			properties: {
				id: {
					const: parent.id
				}
			}
		}, {
			links: {
				'has child': {
					sortBy: [ 'data', 'sequence' ]
				}
			}
		})

	test.deepEqual(
		results.map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: parent.id
		} ]
	)
	test.deepEqual(
		results[0].links['has child'].map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: child2.id
		}, {
			id: child1.id
		} ]
	)
})

ava('.query() should be able to skip linked cards', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0'
		})

	const child1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 1
			}
		})

	const child2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 0
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child1.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child1.id,
					type: child1.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child2.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child2.id,
					type: child2.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			$$links: {
				'has child': true
			},
			properties: {
				id: {
					const: parent.id
				}
			}
		}, {
			links: {
				'has child': {
					skip: 1,
					sortBy: [ 'data', 'sequence' ]
				}
			}
		})

	test.deepEqual(
		results.map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: parent.id
		} ]
	)
	test.deepEqual(
		results[0].links['has child'].map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: child1.id
		} ]
	)
})

ava('.query() should be able to limit linked cards', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0'
		})

	const child1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 1
			}
		})

	const child2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 0
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child1.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child1.id,
					type: child1.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child2.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child2.id,
					type: child2.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			$$links: {
				'has child': true
			},
			properties: {
				id: {
					const: parent.id
				}
			}
		}, {
			links: {
				'has child': {
					limit: 1,
					sortBy: [ 'data', 'sequence' ]
				}
			}
		})

	test.deepEqual(
		results.map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: parent.id
		} ]
	)
	test.deepEqual(
		results[0].links['has child'].map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: child2.id
		} ]
	)
})

ava('.query() should be able to skip and limit linked cards', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0'
		})

	const child1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 1
			}
		})

	const child2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			data: {
				sequence: 0
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child1.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child1.id,
					type: child1.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child2.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'has child',
				from: {
					id: child2.id,
					type: child2.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			$$links: {
				'has child': true
			},
			properties: {
				id: {
					const: parent.id
				}
			}
		}, {
			links: {
				'has child': {
					skip: 1,
					limit: 1,
					sortBy: [ 'data', 'sequence' ]
				}
			}
		})

	test.deepEqual(
		results.map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: parent.id
		} ]
	)
	test.deepEqual(
		results[0].links['has child'].map((card) => {
			return {
				id: card.id
			}
		}),
		[ {
			id: child1.id
		} ]
	)
})

ava('.query() should return the cards that match a schema', async (test) => {
	const result1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johnsmith@example.io'
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			properties: {
				id: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: `${result1.slug}$`
				},
				type: {
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						email: {
							type: 'string'
						}
					},
					required: [ 'email' ]
				}
			},
			required: [ 'id', 'slug', 'type', 'data' ]
		})

	test.deepEqual(results, [
		{
			id: result1.id,
			slug: result1.slug,
			type: 'card@1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava('.query() should work if passing an $id top level property', async (test) => {
	const result1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johnsmith@example.io'
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			$id: 'foobar',
			type: 'object',
			additionalProperties: false,
			properties: {
				id: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: `${result1.slug}$`
				},
				type: {
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						email: {
							type: 'string'
						}
					},
					required: [ 'email' ]
				}
			},
			required: [ 'id', 'slug', 'type', 'data' ]
		})

	test.deepEqual(results, [
		{
			id: result1.id,
			slug: result1.slug,
			type: 'card@1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava('.query() should be able to describe a property that starts with $', async (test) => {
	const result1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				$foo: 'bar'
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			properties: {
				slug: {
					type: 'string',
					pattern: `${result1.slug}$`
				},
				type: {
					type: 'string'
				},
				version: {
					type: 'string'
				},
				data: {
					type: 'object',
					properties: {
						$foo: {
							type: 'string'
						}
					},
					required: [ '$foo' ]
				}
			},
			required: [ 'slug', 'type', 'version', 'data' ]
		})

	test.deepEqual(results, [ result1 ])
})

ava('.query() should take roles into account', async (test) => {
	const role = context.generateRandomSlug('foo')
	const actor = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io',
				roles: [ role ]
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: actor.id
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `role-${role}`,
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					required: [ 'type', 'data' ],
					properties: {
						type: {
							type: 'string',
							const: 'type@1.0.0'
						},
						data: {
							type: 'object',
							required: [ 'schema' ],
							properties: {
								schema: {
									type: 'object',
									additionalProperties: true
								}
							}
						}
					}
				}
			}
		})

	const results = await context.kernel.query(
		context.context, session.id, {
			type: 'object',
			required: [ 'type', 'slug', 'active', 'data' ],
			additionalProperties: false,
			properties: {
				type: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: '^user'
				},
				active: {
					type: 'boolean'
				},
				data: {
					type: 'object'
				}
			}
		})

	test.deepEqual(results, [
		_.pick(await CARDS.user, [
			'type',
			'slug',
			'active',
			'data'
		])
	])
})

ava('.query() should take roles into account when querying for linked cards', async (test) => {
	const role = context.generateRandomSlug('foo')
	const actor = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io',
				roles: [ role ]
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: actor.id
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `role-${role}`,
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					required: [ 'type' ],
					properties: {
						type: {
							type: 'string',
							not: {
								const: 'org@1.0.0'
							}
						}
					}
				}
			}
		})

	const org = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'org@1.0.0',
			name: 'Foo Ltd'
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${actor.slug}-is-part-of-${org.slug}`,
			type: 'link@1.0.0',
			name: 'is part of',
			data: {
				inverseName: 'has member',
				from: {
					id: actor.id,
					type: actor.type
				},
				to: {
					id: org.id,
					type: org.type
				}
			}
		})

	const attachment = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0'
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${actor.slug}-is-attached-to-${attachment.slug}`,
			type: 'link@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: actor.id,
					type: actor.type
				},
				to: {
					id: attachment.id,
					type: attachment.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, session.id, {
			type: 'object',
			$$links: {
				'is attached to': {
					type: 'object'
				},
				'is part of': {
					type: 'object'
				}
			},
			properties: {
				id: {
					type: 'string',
					const: actor.id
				}
			}
		})

	test.deepEqual(results, [])
})

ava('.query() should ignore queries to properties not whitelisted by a role', async (test) => {
	const role = context.generateRandomSlug({
		prefix: 'foo'
	})
	const actor = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ role ]
		}
	})

	const session = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${role}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				additionalProperties: false,
				properties: {
					slug: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'type@1.0.0'
					}
				}
			}
		}
	})

	const results = await context.kernel.query(context.context, session.id, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: '^user'
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'type@1.0.0',
			slug: 'user'
		}
	])
})

ava('.query() should ignore $id properties in roles', async (test) => {
	const role = context.generateRandomSlug('foo')
	const actor = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io',
				roles: [ role ]
			}
		})

	const session = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: actor.id
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `role-${role}`,
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					$id: 'foobar',
					additionalProperties: false,
					properties: {
						slug: {
							type: 'string'
						},
						type: {
							type: 'string',
							const: 'type@1.0.0'
						}
					}
				}
			}
		})

	const results = await context.kernel.query(
		context.context, session.id, {
			type: 'object',
			additionalProperties: true,
			properties: {
				id: {
					type: 'string'
				},
				type: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: '^user'
				}
			}
		})

	test.deepEqual(results, [
		{
			type: 'type@1.0.0',
			slug: 'user'
		}
	])
})

ava('.query() should ignore queries to disallowed properties with additionalProperties: true', async (test) => {
	const role = context.generateRandomSlug('foo')
	const actor = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug(),
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ role ]
		}
	})

	const session = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	})

	await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: `role-${role}`,
		type: 'role@1.0.0',
		version: '1.0.0',
		data: {
			read: {
				type: 'object',
				additionalProperties: false,
				properties: {
					slug: {
						type: 'string'
					},
					type: {
						type: 'string',
						const: 'type@1.0.0'
					}
				}
			}
		}
	})

	const results = await context.kernel.query(context.context, session.id, {
		type: 'object',
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				pattern: '^user'
			}
		}
	})

	test.deepEqual(results, [
		{
			type: 'type@1.0.0',
			slug: 'user'
		}
	])
})

ava('.query() should return all action request cards', async (test) => {
	const date = new Date()
	const request = {
		type: 'action-request@1.0.0',
		slug: context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			epoch: date.valueOf(),
			action: 'action-foo@1.0.0',
			context: context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			timestamp: date.toISOString(),
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card@1.0.0'
			},
			arguments: {
				foo: 'bar'
			}
		}
	}

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, request)

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			properties: {
				type: {
					type: 'string',
					const: 'action-request@1.0.0'
				},
				data: {
					type: 'object',
					additionalProperties: true
				}
			},
			required: [ 'type', 'data' ]
		})

	test.deepEqual(results, [
		{
			type: 'action-request@1.0.0',
			data: {
				action: 'action-foo@1.0.0',
				context: context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				epoch: date.valueOf(),
				input: {
					id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					type: 'card@1.0.0'
				},
				timestamp: date.toISOString(),
				arguments: {
					foo: 'bar'
				}
			}
		}
	])
})

ava('.query() should be able to return both action requests and other cards', async (test) => {
	const date = new Date()
	const result1 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		type: 'action-request@1.0.0',
		slug: context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			epoch: date.valueOf(),
			action: 'action-foo@1.0.0',
			context: context.context,
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			target: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			timestamp: date.toISOString(),
			input: {
				id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				type: 'card@1.0.0'
			},
			arguments: {
				foo: 'bar'
			}
		}
	})

	const result2 = await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			timestamp: date.toISOString()
		}
	})

	const results = await context.kernel.query(context.context, context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			id: {
				type: 'string'
			},
			data: {
				type: 'object',
				properties: {
					timestamp: {
						type: 'string',
						const: date.toISOString()
					}
				},
				required: [ 'timestamp' ]
			}
		},
		required: [ 'id', 'data' ]
	})

	test.deepEqual(_.orderBy(_.map(results, 'id')), _.orderBy([ result1.id, result2.id ]))
})

ava('.query() should return inactive cards', async (test) => {
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `${context.generateRandomSlug()}-john-smith`,
			type: 'card@1.0.0',
			version: '1.0.0',
			active: false,
			data: {
				email: 'johnsmith@example.io',
				roles: []
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			properties: {
				slug: {
					type: 'string',
					pattern: 'smith$'
				}
			},
			required: [ 'slug' ]
		})

	test.deepEqual(results, [
		{
			slug: card.slug
		}
	])
})

ava('.query() should take a view card with two filters', async (test) => {
	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			tags: [ 'foo' ],
			data: {
				number: 1
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				number: 1
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'view'
			}),
			type: 'view@1.0.0',
			version: '1.0.0',
			tags: [],
			markers: [],
			links: {},
			active: true,
			data: {
				allOf: [
					{
						name: 'foo',
						schema: {
							type: 'object',
							properties: {
								data: {
									type: 'object',
									properties: {
										number: {
											type: 'number',
											const: 1
										}
									},
									required: [ 'number' ]
								}
							},
							required: [ 'data' ]
						}
					},
					{
						name: 'bar',
						schema: {
							type: 'object',
							properties: {
								tags: {
									type: 'array',
									contains: {
										type: 'string',
										const: 'foo'
									}
								}
							},
							required: [ 'tags' ]
						}
					}
				]
			}
		})

	test.deepEqual(results.map((element) => {
		return _.pick(element, [ 'tags', 'data' ])
	}), [
		{
			tags: [ 'foo' ],
			data: {
				number: 1
			}
		}
	])
})

ava('.query() should be able to request all cards (with no properties) linked to a card', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card.slug}-is-appended-to-${parent.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is appended to',
			active: true,
			data: {
				inverseName: 'has appended element',
				from: {
					id: card.id,
					type: card.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			$$links: {
				'is appended to': {
					type: 'object',
					required: [ 'slug', 'type' ],
					properties: {
						slug: {
							type: 'string',
							const: parent.slug
						},
						type: {
							type: 'string',
							const: parent.type
						}
					}
				}
			}
		})

	// This is by design, as we want to catch the case where
	// we send a JSON Schema that doesn't try to get any
	// properties back.
	test.deepEqual(results, [
		{}
	])
})

ava('.query() should get all properties of all cards', async (test) => {
	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true
		})

	const properties = _.sortBy(_.intersection(..._.map(results, _.keys)))

	test.deepEqual(properties, [
		'active',
		'capabilities',
		'created_at',
		'data',
		'id',
		'linked_at',
		'links',
		'markers',
		'name',
		'requires',
		'slug',
		'tags',
		'type',
		'updated_at',
		'version'
	])
})

ava('.query() should not consider inactive links', async (test) => {
	const parent1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const parent2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	const card1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-attached-to-${parent1.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			active: false,
			data: {
				inverseName: 'has attached element',
				from: {
					id: card1.id,
					type: card1.type
				},
				to: {
					id: parent1.id,
					type: parent1.type
				}
			}
		})

	const card2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 2
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card2.slug}-is-attached-to-${parent2.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card2.id,
					type: card2.type
				},
				to: {
					id: parent2.id,
					type: parent2.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			required: [ 'type', 'links', 'data' ],
			$$links: {
				'is attached to': {
					type: 'object',
					required: [ 'id', 'data' ],
					properties: {
						id: {
							type: 'string'
						},
						data: {
							type: 'object',
							required: [ 'thread' ],
							properties: {
								thread: {
									type: 'boolean'
								}
							},
							additionalProperties: false
						}
					},
					additionalProperties: false
				}
			},
			properties: {
				type: {
					type: 'string',
					const: 'card@1.0.0'
				},
				links: {
					type: 'object',
					additionalProperties: true
				},
				data: {
					type: 'object',
					required: [ 'count' ],
					properties: {
						count: {
							type: 'number'
						}
					},
					additionalProperties: true
				}
			}
		})

	test.deepEqual(results, [
		{
			type: 'card@1.0.0',
			links: {
				'is attached to': [
					{
						id: parent2.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2,
				thread: false
			}
		}
	])
})

ava('.query() should be able to query using links', async (test) => {
	const ref = uuid()
	const parent1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const parent2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 3
			}
		})

	const card1 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1,
				ref
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-attached-to-${parent1.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card1.id,
					type: card1.type
				},
				to: {
					id: parent1.id,
					type: parent1.type
				}
			}
		})

	const card2 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 2,
				ref
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card2.slug}-is-attached-to-${parent1.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card2.id,
					type: card2.type
				},
				to: {
					id: parent1.id,
					type: parent1.type
				}
			}
		})

	const card3 = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 3,
				ref
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${card3.slug}-is-attached-to-${parent2.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card3.id,
					type: card3.type
				},
				to: {
					id: parent2.id,
					type: parent2.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			required: [ 'type', 'links', 'data' ],
			$$links: {
				'is attached to': {
					type: 'object',
					required: [ 'id', 'data' ],
					properties: {
						id: {
							type: 'string'
						},
						data: {
							type: 'object',
							required: [ 'thread' ],
							properties: {
								thread: {
									type: 'boolean',
									const: true
								}
							},
							additionalProperties: false
						}
					},
					additionalProperties: false
				}
			},
			properties: {
				type: {
					type: 'string',
					const: 'card@1.0.0'
				},
				links: {
					type: 'object',
					additionalProperties: true
				},
				data: {
					type: 'object',
					required: [ 'count', 'ref' ],
					properties: {
						count: {
							type: 'number'
						},
						ref: {
							type: 'string',
							const: ref
						}
					},
					additionalProperties: false
				}
			}
		}, {
			sortBy: [ 'data', 'count' ]
		})

	test.deepEqual(results, [
		{
			type: 'card@1.0.0',
			links: {
				'is attached to': [
					{
						id: parent1.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 1,
				ref
			}
		},
		{
			type: 'card@1.0.0',
			links: {
				'is attached to': [
					{
						id: parent1.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 2,
				ref
			}
		},
		{
			type: 'card@1.0.0',
			links: {
				'is attached to': [
					{
						id: parent2.id,
						data: {
							thread: true
						}
					}
				]
			},
			data: {
				count: 3,
				ref
			}
		}
	])
})

ava('.query() should be able to query using multiple link types', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})

	const ownedCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})
	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${ownedCard.slug}-is-owned-by-${parent.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is owned by',
			data: {
				inverseName: 'owns',
				from: {
					id: ownedCard.id,
					type: ownedCard.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const attachedCard = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})
	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${attachedCard.slug}-is-attached-to-${parent.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: attachedCard.id,
					type: attachedCard.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			type: 'object',
			$$links: {
				'has attached element': {
					type: 'object',
					required: [ 'id' ],
					properties: {
						id: {
							type: 'string'
						}
					},
					additionalProperties: false
				},
				owns: {
					type: 'object',
					required: [ 'id' ],
					properties: {
						id: {
							type: 'string'
						}
					},
					additionalProperties: false
				}
			},
			properties: {
				id: {
					type: 'string',
					const: parent.id
				},
				links: {
					type: 'object'
				}
			},
			required: [ 'links' ]
		})

	test.deepEqual(results[0].links, {
		'has attached element': [ {
			id: attachedCard.id
		} ],
		owns: [ {
			id: ownedCard.id
		} ]
	})
})

ava('.query() should be able to query $$links inside $$links', async (test) => {
	const parent = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})

	const child = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})

	const grandchild = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${child.slug}-is-child-of-${parent.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'owns',
				from: {
					id: child.id,
					type: child.type
				},
				to: {
					id: parent.id,
					type: parent.type
				}
			}
		})

	await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: `link-${grandchild.slug}-is-child-of-${child.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is child of',
			data: {
				inverseName: 'owns',
				from: {
					id: grandchild.id,
					type: grandchild.type
				},
				to: {
					id: child.id,
					type: child.type
				}
			}
		})

	const santa = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug(),
			type: 'card@1.0.0',
			version: '1.0.0'
		})

	for (const eternalChild of [ parent, child, grandchild ]) {
		await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug: `link-${eternalChild.slug}-believes-in-${santa.slug}`,
				type: 'link@1.0.0',
				version: '1.0.0',
				name: 'believes in',
				data: {
					inverseName: 'is believed by',
					from: {
						id: eternalChild.id,
						type: eternalChild.type
					},
					to: {
						id: santa.id,
						type: santa.type
					}
				}
			})
	}

	const results = await context.kernel.query(
		context.context, context.kernel.sessions.admin, {
			$$links: {
				'is child of': {
					$$links: {
						'is child of': {
							$$links: {
								'believes in': {
									properties: {
										id: {
											const: santa.id
										}
									}
								}
							},
							properties: {
								id: {
									const: parent.id
								},
								links: true
							}
						},
						'believes in': {
							properties: {
								id: {
									const: santa.id
								}
							}
						}
					},
					properties: {
						id: {
							const: child.id
						},
						links: true
					}
				},
				'believes in': {
					properties: {
						id: {
							const: santa.id
						}
					}
				}
			},
			properties: {
				id: {
					const: grandchild.id
				},
				links: true
			}
		})

	test.deepEqual(results.length, 1)
	test.deepEqual(results[0].id, grandchild.id)
	test.deepEqual(results[0].links['believes in'][0].id, santa.id)
	test.deepEqual(results[0].links['is child of'][0].id, child.id)
	test.deepEqual(results[0].links['is child of'][0].links['believes in'][0].id, santa.id)
	test.deepEqual(results[0].links['is child of'][0].links['is child of'][0].id, parent.id)
	test.deepEqual(results[0].links['is child of'][0].links['is child of'][0].links['believes in'][0].id, santa.id)
})

ava.cb('.stream() should include data if additionalProperties true', (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'card'
	})
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		required: [ 'slug', 'active', 'type' ],
		properties: {
			slug: {
				type: 'string',
				const: slug
			},
			active: {
				type: 'boolean',
				const: true
			},
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		}
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change, {
				type: 'insert',
				before: null,
				after: {
					id: change.after.id,
					slug,
					type: 'card@1.0.0',
					active: true,
					version: '1.0.0',
					tags: [],
					name: null,
					markers: [],
					created_at: change.after.created_at,
					updated_at: null,
					linked_at: {},
					links: {},
					requires: [],
					capabilities: [],
					data: {
						test: 1
					}
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

		promise = context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			})
	})
})

ava.cb('.stream() should report back new elements that match a certain slug', (test) => {
	const slug = context.generateRandomSlug({
		prefix: 'card'
	})
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: false,
		properties: {
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: slug
			},
			active: {
				type: 'boolean'
			},
			links: {
				type: 'object'
			},
			tags: {
				type: 'array'
			},
			data: {
				type: 'object',
				properties: {
					test: {
						type: 'number'
					}
				}
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'card@1.0.0',
				slug,
				active: true,
				links: {},
				tags: [],
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
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}),
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug({
					prefix: 'card'
				}),
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})
		])
	}).catch(test.end)
})

ava.cb('.stream() should report back elements of a certain type', (test) => {
	const slug = context.generateRandomSlug()
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: false,
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'card@1.0.0'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				},
				required: [ 'email' ]
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		let promise = Bluebird.resolve()

		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				slug,
				type: 'card@1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			})

			emitter.close()
		})

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
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug(),
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}),
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			})
		])
	}).catch(test.end)
})

ava.cb('.stream() should be able to attach a large number of streams', (test) => {
	const slug = context.generateRandomSlug()
	const schema = {
		type: 'object',
		additionalProperties: false,
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'card@1.0.0'
			},
			data: {
				type: 'object',
				properties: {
					email: {
						type: 'string'
					}
				},
				required: [ 'email' ]
			}
		},
		required: [ 'type' ]
	}

	const times = 400

	Bluebird.all(_.times(times, () => {
		return context.kernel.stream(
			context.context, context.kernel.sessions.admin, schema)
	})).then((streams) => {
		const promises = streams.map((emitter) => {
			return new Bluebird((resolve, reject) => {
				let result = null

				emitter.on('data', (change) => {
					result = change
					setTimeout(() => {
						emitter.close()
					}, 200)
				})

				emitter.on('error', reject)
				emitter.on('closed', () => {
					return resolve(result)
				})
			})
		})

		return Bluebird.delay(8000).then(() => {
			return context.kernel.insertCard(
				context.context, context.kernel.sessions.admin, {
					slug,
					type: 'card@1.0.0',
					version: '1.0.0',
					data: {
						email: 'johndoe@example.com'
					}
				})
		}).then(() => {
			return Bluebird.all(promises)
		})
	}).then((results) => {
		test.deepEqual(results.map((result) => {
			return _.omit(result, [ 'id' ])
		}), _.times(times, _.constant({
			before: null,
			type: 'insert',
			after: {
				slug,
				type: 'card@1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			}
		})))

		test.end()
	}).catch(test.end)
})

ava.cb('.stream() should report back action requests', (test) => {
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				pattern: '^action-request@'
			},
			data: {
				type: 'object',
				properties: {
					action: {
						type: 'string'
					},
					actor: {
						type: 'string'
					},
					timestamp: {
						type: 'string'
					},
					arguments: {
						type: 'object',
						additionalProperties: true
					}
				}
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'action-request@1.0.0',
				data: {
					context: context.context,
					epoch: 1521170969543,
					action: 'action-delete-card@1.0.0',
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					input: {
						id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
						type: 'card@1.0.0'
					},
					timestamp: '2018-03-16T03:29:29.543Z',
					arguments: {}
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
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				type: 'action-request@1.0.0',
				slug: context.generateRandomSlug({
					prefix: 'action-request'
				}),
				version: '1.0.0',
				data: {
					context: context.context,
					action: 'action-delete-card@1.0.0',
					actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					epoch: 1521170969543,
					timestamp: '2018-03-16T03:29:29.543Z',
					input: {
						id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
						type: 'card@1.0.0'
					},
					arguments: {}
				}
			}),
			context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug(),
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					email: 'johndoe@example.com'
				}
			})
		])
	}).catch(test.end)
})

ava.cb('.stream() should close without finding anything', (test) => {
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string',
				const: context.generateRandomSlug()
			}
		},
		required: [ 'slug' ]
	}).then((emitter) => {
		emitter.on('error', test.end)
		emitter.on('closed', test.end)
		emitter.close()
	}).catch(test.end)
})

ava.cb('.stream() should report back inactive elements', (test) => {
	const slug = context.generateRandomSlug()
	context.kernel.stream(context.context, context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: false,
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'card@1.0.0'
			}
		},
		required: [ 'type' ]
	}).then((emitter) => {
		emitter.on('data', (change) => {
			test.deepEqual(change.before, null)
			test.deepEqual(_.omit(change.after, [ 'id' ]), {
				type: 'card@1.0.0',
				slug
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

		promise = context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug,
				active: false,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})
	}).catch(test.end)
})

ava.cb('.stream() should be able to resolve links on an update to the base card', (test) => {
	Bluebird.try(async () => {
		const slug = context.generateRandomSlug()
		const card1 = await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			})

		const card2	= await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug(),
				active: false,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})

		await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
			type: 'link@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card1.id,
					type: card1.type
				},
				to: {
					id: card2.id,
					type: card2.type
				}
			}
		})

		context.kernel.stream(context.context, context.kernel.sessions.admin, {
			$$links: {
				'is attached to': {
					type: 'object',
					additionalProperties: false,
					properties: {
						slug: {
							type: 'string'
						}
					}
				}
			},
			type: 'object',
			additionalProperties: false,
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string',
					const: 'card@1.0.0'
				}
			},
			required: [ 'type' ]
		}).then((emitter) => {
			emitter.on('data', (change) => {
				test.deepEqual(_.omit(change.after, [ 'id' ]), {
					type: 'card@1.0.0',
					slug,
					links: {
						'is attached to': [ {
							slug: card2.slug
						} ]
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

			promise = context.kernel.patchCardBySlug(
				context.context, context.kernel.sessions.admin, `${card1.slug}@${card1.version}`, [
					{
						op: 'replace',
						path: '/data/test',
						value: 3
					}
				], {
					type: card1.type
				})
		})
	}).catch(test.end)
})

ava.cb('.stream() should be able to resolve links when a new link is added', (test) => {
	Bluebird.try(async () => {
		const slug = context.generateRandomSlug()

		const card1 = await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			})

		const card2	= await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug(),
				active: false,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})

		context.kernel.stream(context.context, context.kernel.sessions.admin, {
			$$links: {
				'is attached to': {
					type: 'object',
					additionalProperties: false,
					properties: {
						slug: {
							type: 'string'
						}
					}
				}
			},
			type: 'object',
			additionalProperties: false,
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string',
					const: 'card@1.0.0'
				}
			},
			required: [ 'type' ]
		}).then((emitter) => {
			emitter.on('data', (change) => {
				test.deepEqual(_.omit(change.after, [ 'id' ]), {
					type: 'card@1.0.0',
					slug,
					links: {
						'is attached to': [ {
							slug: card2.slug
						} ]
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

			promise = context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
				slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
				type: 'link@1.0.0',
				name: 'is attached to',
				data: {
					inverseName: 'has attached element',
					from: {
						id: card1.id,
						type: card1.type
					},
					to: {
						id: card2.id,
						type: card2.type
					}
				}
			})
		})
	}).catch(test.end)
})

// TODO: Get this working, but in a performant way.
ava.cb.skip('.stream() should be able to resolve links on an update to the linked card', (test) => {
	Bluebird.try(async () => {
		const slug = context.generateRandomSlug()

		const card1 = await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			})

		const card2	= await context.kernel.insertCard(
			context.context, context.kernel.sessions.admin, {
				slug: context.generateRandomSlug(),
				active: false,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})

		await context.kernel.insertCard(context.context, context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-attached-to-${card2.slug}`,
			type: 'link@1.0.0',
			name: 'is attached to',
			data: {
				inverseName: 'has attached element',
				from: {
					id: card1.id,
					type: card1.type
				},
				to: {
					id: card2.id,
					type: card2.type
				}
			}
		})

		context.kernel.stream(context.context, context.kernel.sessions.admin, {
			$$links: {
				'is attached to': {
					type: 'object',
					additionalProperties: false,
					properties: {
						slug: {
							type: 'string'
						},
						data: {
							type: 'object'
						}
					}
				}
			},
			type: 'object',
			additionalProperties: false,
			properties: {
				slug: {
					type: 'string',
					const: slug
				},
				type: {
					type: 'string',
					const: 'card@1.0.0'
				}
			},
			required: [ 'type' ]
		}).then((emitter) => {
			emitter.on('data', (change) => {
				test.deepEqual(_.omit(change.after, [ 'id' ]), {
					type: 'card@1.0.0',
					slug,
					links: {
						'is attached to': [ {
							slug: card2.slug
						} ]
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

			promise = context.kernel.patchCardBySlug(
				context.context, context.kernel.sessions.admin, `${card2.slug}@${card1.version}`, [
					{
						op: 'replace',
						path: '/data/test',
						value: 3
					}
				], {
					type: card1.type
				})
		})
	}).catch(test.end)
})

ava('.insertCard() should create a user with two email addressses', async (test) => {
	const card = await context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'johndoe@example.com', 'johndoe@gmail.com' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	test.deepEqual(card.data.email, [ 'johndoe@example.com', 'johndoe@gmail.com' ])
})

ava('.insertCard() should not create a user with an empty email list', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should not create a user with an invalid email', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'foo' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should not create a user with an invalid and a valid email', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'johndoe@example.com', 'foo' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})

ava('.insertCard() should not create a user with duplicated emails', async (test) => {
	await test.throwsAsync(context.kernel.insertCard(
		context.context, context.kernel.sessions.admin, {
			slug: context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'johndoe@example.com', 'johndoe@example.com' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), {
		instanceOf: errors.JellyfishSchemaMismatch
	})
})
