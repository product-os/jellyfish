/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const uuid = require('uuid/v4')
const errors = require('../../../lib/core/errors')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

ava('should only expose the required methods', (test) => {
	const methods = Object.getOwnPropertyNames(
		Reflect.getPrototypeOf(test.context.kernel))

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
		'getStatus',
		'lock',
		'unlock'
	])
})

for (const key in CARDS) {
	ava(`should contain the ${key} card by default`, async (test) => {
		const card = await CARDS[key]
		card.name = _.isString(card.name) ? card.name : null
		const element = await test.context.kernel.getCardBySlug(
			test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`)
		test.deepEqual(card, _.omit(element, [ 'created_at', 'id', 'updated_at', 'linked_at' ]))
	})
}

ava('should be able to disconnect the kernel multiple times without errors', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.disconnect(test.context.context)
		await test.context.kernel.disconnect(test.context.context)
		await test.context.kernel.disconnect(test.context.context)
	})
})

ava('.disconnect() should gracefully close streams', async (test) => {
	await test.notThrowsAsync(async () => {
		await test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
			type: 'object'
		})
		await test.context.kernel.disconnect(test.context.context)
	})
})

ava('.patchCardBySlug() should throw an error if the element does not exist', async (test) => {
	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foobarbaz@1.0.0', [
			{
				op: 'replace',
				path: '/active',
				value: false
			}
		], {
			type: 'card@1.0.0'
		}), errors.JellyfishNoElement)
})

ava('.patchCardBySlug() should apply a single operation', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.context.kernel.patchCardBySlug(
		test.context.context,
		test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 'baz'
			}
		], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context,
		test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
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
		slug: 'foobarbaz',
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
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.context.kernel.patchCardBySlug(
		test.context.context,
		test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/markers/0',
				value: 'test'
			}
		], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
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
		slug: 'foobarbaz',
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
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar',
				bar: 'baz'
			}
		})

	await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/data/foo'
			}
		], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
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
		slug: 'foobarbaz',
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
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
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

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
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
		slug: 'foobarbaz',
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
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/id'
			}
		], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not be able to delete a top level property', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/tags'
			}
		], {
			type: card.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw if the patch does not match', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'delete',
				path: '/data/hello'
			}
		], {
			type: card.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw if adding to non existent property', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'add',
				path: '/data/hello/world',
				value: 1
			}
		], {
			type: card.type
		}), errors.JellyfishInvalidPatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should throw given an invalid operation', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'bar',
				path: '/data/foo',
				value: 1
			}
		], {
			type: card.type
		}), errors.JellyfishInvalidPatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not apply half matching patches', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
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
		}), errors.JellyfishInvalidPatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should not break the type schema', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'remove',
				path: '/data/roles'
			}
		], {
			type: card.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should apply a no-op patch', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 'bar'
			}
		], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should apply an empty set of patches', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [], {
			type: card.type
		})

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should ignore changes to read-only properties', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foobarbaz',
			tags: [],
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				foo: 'bar'
			}
		})

	const patched = await test.context.kernel.patchCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, [
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

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${card.slug}@${card.version}`, {
			type: card.type
		})

	test.deepEqual(patched, card)
	test.deepEqual(result, card)
})

ava('.patchCardBySlug() should be able to patch cards hidden to the user', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	test.falsy(await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		}))

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'add',
				path: '/data/foo',
				value: 'bar'
			}
		], {
			type: userCard.type
		}), errors.JellyfishNoElement)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not allow updates in hidden fields', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`)

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'replace',
				path: '/data/roles',
				value: [ 'admin' ]
			}
		], {
			type: userCard.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not return the full card', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	const patched = await test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, [
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

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result.data, {
		email: 'johndoe@gmail.com',
		hash: 'secret',
		roles: []
	})
})

ava('.patchCardBySlug() should not allow a patch that makes a card inaccessible', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const randomCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'random-1',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				hello: 'world',
				foo: 7
			}
		})

	const filteredCard = await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${randomCard.slug}@${randomCard.version}`, {
			type: randomCard.type
		})

	test.deepEqual(filteredCard, randomCard)

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${randomCard.slug}@${randomCard.version}`, [
			{
				op: 'replace',
				path: '/data/foo',
				value: 8
			}
		], {
			type: randomCard.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${randomCard.slug}@${randomCard.version}`, {
			type: randomCard.type
		})

	test.deepEqual(result, randomCard)
})

ava('.patchCardBySlug() should not remove inaccessible fields', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'remove',
				path: '/data/hash'
			}
		], {
			type: userCard.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.patchCardBySlug() should not add an inaccesible field', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'secret',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const filteredUser = await test.context.kernel.getCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(filteredUser.data, {
		email: 'johndoe@example.com'
	})

	await test.throwsAsync(test.context.kernel.patchCardBySlug(
		test.context.context, session.id, `${userCard.slug}@${userCard.version}`, [
			{
				op: 'add',
				path: '/data/special',
				value: 7
			}
		], {
			type: userCard.type
		}), errors.JellyfishSchemaMismatch)

	const result = await test.context.kernel.getCardBySlug(
		test.context.context,
		test.context.kernel.sessions.admin, `${userCard.slug}@${userCard.version}`, {
			type: userCard.type
		})

	test.deepEqual(result, userCard)
})

ava('.insertCard() should throw an error if the element is not a valid card', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		hello: 'world'
	}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the element does not adhere to the type', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'action-foo-bar',
		type: 'action@1.0.0',
		version: '1.0.0',
		data: {}
	}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the slug contains @latest', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'test-1@latest',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the slug contains a version', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'test-1@1.0.0',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should throw an error if the card type does not exist', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'foobarbazqux@1.0.0',
		version: '1.0.0',
		active: true,
		data: {}
	}), errors.JellyfishUnknownCardType)
})

ava('.insertCard() should be able to insert a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should be able to set a tag with a colon', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		tags: [ 'foo:bar' ],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should be able to set a tag with a space and a slash', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		tags: [ 'CUSTOM HARDWARE/OS' ],
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: 'bar'
		}
	})

	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, card.id)
	test.deepEqual(element, card)
})

ava('.insertCard() should use defaults if required keys are missing', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'hello-world',
		type: 'card@1.0.0'
	})

	test.deepEqual(card, {
		id: card.id,
		created_at: card.created_at,
		updated_at: null,
		linked_at: {},
		slug: 'hello-world',
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
	const card = {
		slug: 'foo-bar',
		type: 'card@1.0.0'
	}

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, card)
	await test.throwsAsync(test.context.kernel.insertCard(test.context.context,
		test.context.kernel.sessions.admin,
		card
	), errors.JellyfishElementAlreadyExists)
})

ava('.replaceCard() should replace an element', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const card2 = await test.context.kernel.replaceCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	test.is(card1.id, card2.id)
	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, card1.id)
	test.deepEqual(element, card2)
})

ava('.insertCard() should be able to create a link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0'
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card@1.0.0'
	})

	const linkCard = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
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

	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
})

ava('.insertCard() should be able to create a direction-less link between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0'
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card@1.0.0'
	})

	const linkCard = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
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

	const element = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, linkCard.id)
	test.not(element.data.from, element.data.to)
	test.is(element.name, element.data.inverseName)
})

ava('.insertCard() should be able to create two different links between two valid cards', async (test) => {
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0'
	})

	const card2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar-baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const linkCard1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
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

	const linkCard2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
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
	const card1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			foo: card1.id
		}
	})

	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
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
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-user-johndoe',
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

	const userCard = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	})

	const targetUserCard = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'user-janedoe',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'janedoe@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	})

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: userCard.id
		}
	})

	await test.throwsAsync(test.context.kernel.replaceCard(test.context.context, session.id, {
		id: targetUserCard.id,
		slug: 'user-janedoe',
		type: 'user@1.0.0',
		version: '1.0.0',
		data: {
			email: 'pwned@example.com',
			hash: 'PASSWORDLESS',
			roles: []
		}
	}), errors.JellyfishSchemaMismatch)
})

ava('.replaceCard() should not overwrite the "created_at" field when overriding a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await test.context.kernel.replaceCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		created_at: new Date(633009018000).toISOString()
	})

	test.is(card.created_at, update.created_at)
})

ava('.replaceCard() should not overwrite the "linked_at" field when overriding a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await test.context.kernel.replaceCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		linked_at: {
			foo: 'bar'
		}
	})

	test.deepEqual(card.linked_at, update.linked_at)
})

ava('.insertCard() should not be able to set links', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: `card-${uuid()}`,
			type: 'card@1.0.0',
			links: {
				foo: 'bar'
			}
		})

	const element = await test.context.kernel.getCardById(
		test.context.context,
		test.context.kernel.sessions.admin,
		card.id)

	test.deepEqual(element.links, {})
})

ava('.replaceCard() should not be able to set links when overriding a card', async (test) => {
	const card = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: `card-${uuid()}`,
		type: 'card@1.0.0'
	})

	const update = await test.context.kernel.replaceCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: card.slug,
		type: 'card@1.0.0',
		links: {
			foo: 'bar'
		}
	})

	test.deepEqual(update.links, {})
})

ava('.getCardBySlug() there should be an admin card', async (test) => {
	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'user-admin@latest')
	test.truthy(card)
})

ava('.getCardById() should find an active card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardById(
		test.context.context, test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.getCardById() should find an active card by its id and type', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardById(
		test.context.context, test.context.kernel.sessions.admin, result.id)

	test.deepEqual(card, result)
})

ava('.getCardBySlug() should find an active card by its slug', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foo-bar@1.0.0')
	test.deepEqual(card, result)
})

ava('.getCardBySlug() should not find an active card by its slug and the wrong version', async (test) => {
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foo-bar@1.0.1')

	test.falsy(card)
})

ava('.getCardBySlug() should not find an invalid slug when using @latest', async (test) => {
	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foo-bar@latest')

	test.falsy(card)
})

ava('.getCardBySlug() should find an active card by its slug using @latest', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foo-bar@latest')

	test.deepEqual(card, result)
})

ava('.getCardBySlug() should find an active card by its slug and its type', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo-bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {}
		})

	const card = await test.context.kernel.getCardBySlug(
		test.context.context, test.context.kernel.sessions.admin, 'foo-bar@1.0.0')

	test.deepEqual(card, result)
})

ava('.getCardById() should return an inactive card by its id', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo-bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {}
	})

	const card = await test.context.kernel.getCardById(test.context.context, test.context.kernel.sessions.admin, result.id)
	test.deepEqual(card, result)
})

ava('.query() should throw an error given an invalid regex', async (test) => {
	await test.throwsAsync(test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'slug' ],
			properties: {
				slug: {
					type: 'string',
					pattern: '-(^[xx'
				}
			}
		}), errors.JellyfishInvalidRegularExpression)
})

ava('.query() should be able to limit the results', async (test) => {
	const result1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				pattern: '^card@'
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
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	const result3 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				pattern: '^card@'
			}
		},
		required: [ 'type' ]
	}, {
		sortBy: 'created_at',
		skip: 2
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result3 ])
})

ava('.query() should be able to limit and skip the results', async (test) => {
	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 1,
			timestamp: '2018-07-20T23:15:45.702Z'
		}
	})

	const result2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'bar',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 2,
			timestamp: '2018-08-20T23:15:45.702Z'
		}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'baz',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			test: 3,
			timestamp: '2018-09-20T23:15:45.702Z'
		}
	})

	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				pattern: '^card@'
			}
		},
		required: [ 'type' ]
	}, {
		limit: 1,
		skip: 1
	})

	test.deepEqual(_.sortBy(results, [ 'data', 'test' ]), [ result2 ])
})

ava('.query() should return the cards that match a schema', async (test) => {
	const result1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johndoe',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johnsmith',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johnsmith@example.io'
			}
		})

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			properties: {
				id: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: 'doe$'
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
			slug: 'johndoe',
			type: 'card@1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava('.query() should work if passing an $id top level property', async (test) => {
	const result1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johndoe',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johnsmith',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johnsmith@example.io'
			}
		})

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			$id: 'foobar',
			type: 'object',
			additionalProperties: false,
			properties: {
				id: {
					type: 'string'
				},
				slug: {
					type: 'string',
					pattern: 'doe$'
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
			slug: 'johndoe',
			type: 'card@1.0.0',
			data: {
				email: 'johndoe@example.io'
			}
		}
	])
})

ava('.query() should be able to describe a property that starts with $', async (test) => {
	const result1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johndoe',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				$foo: 'bar'
			}
		})

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			properties: {
				slug: {
					type: 'string',
					pattern: 'doe$'
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
	const actor = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johndoe',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io',
				roles: [ 'foo' ]
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: actor.id
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'role-foo',
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

	const results = await test.context.kernel.query(
		test.context.context, session.id, {
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

ava('.query() should ignore queries to properties not whitelisted by a role', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-foo',
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

	const results = await test.context.kernel.query(test.context.context, session.id, {
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
			slug: 'user',
			markers: []
		}
	])
})

ava('.query() should ignore $id properties in roles', async (test) => {
	const actor = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johndoe',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.io',
				roles: [ 'foo' ]
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: actor.id
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'role-foo',
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

	const results = await test.context.kernel.query(
		test.context.context, session.id, {
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
			markers: [],
			slug: 'user'
		}
	])
})

ava('.query() should ignore queries to disallowed properties with additionalProperties: true', async (test) => {
	const actor = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'johndoe',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.io',
			roles: [ 'foo' ]
		}
	})

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: actor.id
		}
	})

	await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'role-foo',
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

	const results = await test.context.kernel.query(test.context.context, session.id, {
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
			markers: [],
			type: 'type@1.0.0',
			slug: 'user'
		}
	])
})

ava('.query() should query all cards of a certain type', async (test) => {
	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		properties: {
			slug: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'user@1.0.0'
			}
		},
		required: [ 'slug', 'type' ]
	})

	test.deepEqual(_.sortBy(_.map(results, 'slug')), [ 'user-admin' ])
})

ava('.query() should return all action request cards', async (test) => {
	const date = new Date()
	const request = {
		type: 'action-request@1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			epoch: date.valueOf(),
			action: 'action-foo@1.0.0',
			context: test.context.context,
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

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, request)

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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
				context: test.context.context,
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
	const result1 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		type: 'action-request@1.0.0',
		slug: test.context.generateRandomSlug({
			prefix: 'action-request'
		}),
		version: '1.0.0',
		data: {
			epoch: date.valueOf(),
			action: 'action-foo@1.0.0',
			context: test.context.context,
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

	const result2 = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'foo',
		type: 'card@1.0.0',
		version: '1.0.0',
		data: {
			timestamp: date.toISOString()
		}
	})

	const results = await test.context.kernel.query(test.context.context, test.context.kernel.sessions.admin, {
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
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'johnsmith',
			type: 'card@1.0.0',
			version: '1.0.0',
			active: false,
			data: {
				email: 'johnsmith@example.io',
				roles: []
			}
		})

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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
			slug: 'johnsmith'
		}
	])
})

ava('.query() should take a view card with two filters', async (test) => {
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			tags: [ 'foo' ],
			data: {
				number: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				number: 1
			}
		})

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'view-myview',
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
	const parent = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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
	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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

ava('.query() should take into account newly inserted links when processing null link queries', async (test) => {
	const parent1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const parent2 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	const card1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-appended-to-${parent1.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is appended to',
			active: true,
			data: {
				inverseName: 'has appended element',
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

	const results1 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			required: [ 'slug', 'type', 'data' ],
			$$links: {
				'has appended element': null
			},
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
					required: [ 'thread' ],
					additionalProperties: true,
					properties: {
						thread: {
							type: 'boolean',
							const: true
						}
					}
				}
			}
		})

	test.deepEqual(results1, [
		{
			slug: 'bar',
			type: 'card@1.0.0',
			data: {
				number: 2,
				thread: true
			}
		}
	])

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-appended-to-${parent2.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is appended to',
			active: true,
			data: {
				inverseName: 'has appended element',
				from: {
					id: card1.id,
					type: card1.type
				},
				to: {
					id: parent2.id,
					type: parent2.type
				}
			}
		})

	const results2 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			required: [ 'slug', 'type', 'data' ],
			$$links: {
				'has appended element': null
			},
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
					required: [ 'thread' ],
					additionalProperties: true,
					properties: {
						thread: {
							type: 'boolean',
							const: true
						}
					}
				}
			}
		})

	test.deepEqual(results2, [])
})

ava('.query() should be able to query for cards without a certain type of link', async (test) => {
	const parent1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	const card1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: `link-${card1.slug}-is-appended-to-${parent1.slug}`,
			type: 'link@1.0.0',
			version: '1.0.0',
			name: 'is appended to',
			active: true,
			data: {
				inverseName: 'has appended element',
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

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: false,
			required: [ 'slug', 'type', 'data' ],
			$$links: {
				'has appended element': null
			},
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
					required: [ 'thread' ],
					additionalProperties: true,
					properties: {
						thread: {
							type: 'boolean',
							const: true
						}
					}
				}
			}
		})

	test.deepEqual(results, [
		{
			slug: 'bar',
			type: 'card@1.0.0',
			data: {
				number: 2,
				thread: true
			}
		}
	])
})

ava('.query() should not consider inactive links', async (test) => {
	const parent1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const parent2 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	const card1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const card2 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'qux',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 2
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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
	const parent1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'foo',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 1
			}
		})

	const parent2 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'bar',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 2
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'baz',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: true,
				number: 3
			}
		})

	const card1 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'qux',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 1
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const card2 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'tux',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 2
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const card3 = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'fux',
			type: 'card@1.0.0',
			version: '1.0.0',
			data: {
				thread: false,
				count: 3
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
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

	const results = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
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
					required: [ 'count' ],
					properties: {
						count: {
							type: 'number'
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
				count: 1
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
				count: 2
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
				count: 3
			}
		}
	])
})

ava.cb('.stream() should include data if additionalProperties true', (test) => {
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: true,
		required: [ 'slug', 'active', 'type' ],
		properties: {
			slug: {
				type: 'string',
				const: 'card-foo-bar-baz'
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
					slug: 'card-foo-bar-baz',
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

		promise = test.context.kernel.insertCard(
			test.context.context, test.context.kernel.sessions.admin, {
				slug: 'card-foo-bar-baz',
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			})
	})
})

ava.cb('.stream() should report back new elements that match a certain slug', (test) => {
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
		type: 'object',
		additionalProperties: false,
		properties: {
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: 'card-foo'
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
				slug: 'card-foo',
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
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				slug: 'card-foo',
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				slug: 'card-bar',
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
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
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
				slug: 'johndoe',
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
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				slug: 'card-foo',
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 1
				}
			}),
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				slug: 'johndoe',
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
		return test.context.kernel.stream(
			test.context.context, test.context.kernel.sessions.admin, schema)
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
			return test.context.kernel.insertCard(
				test.context.context, test.context.kernel.sessions.admin, {
					slug: 'johndoe',
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
				slug: 'johndoe',
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
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
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
					context: test.context.context,
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
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				type: 'action-request@1.0.0',
				slug: test.context.generateRandomSlug({
					prefix: 'action-request'
				}),
				version: '1.0.0',
				data: {
					context: test.context.context,
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
			test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
				slug: 'johndoe',
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
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
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

ava.cb('.stream() should report back inactive elements', (test) => {
	test.context.kernel.stream(test.context.context, test.context.kernel.sessions.admin, {
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
				slug: 'card-bar'
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

		promise = test.context.kernel.insertCard(
			test.context.context, test.context.kernel.sessions.admin, {
				slug: 'card-bar',
				active: false,
				type: 'card@1.0.0',
				version: '1.0.0',
				data: {
					test: 2
				}
			})
	}).catch(test.end)
})

ava('.lock() should be able to lock a non-locked slug', async (test) => {
	const card = {
		slug: 'locktest-1234',
		links: {},
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {}
	}

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, card)

	const result = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(result, card.slug)
})

ava('.unlock() should be able to unlock a locked slug by the same owner', async (test) => {
	const card = {
		slug: 'locktest-1234',
		links: {},
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {}
	}

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, card)

	const lockResult = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(lockResult, card.slug)

	const unlockResult = await test.context.kernel.unlock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(unlockResult, card.slug)
})

ava('.lock() should not let the same owner take a lock twice without unlocking', async (test) => {
	const card = {
		slug: 'locktest-1234',
		links: {},
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {}
	}

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, card)

	const lockResult1 = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(lockResult1, card.slug)

	const lockResult2 = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.falsy(lockResult2)

	const unlockResult = await test.context.kernel.unlock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(unlockResult, card.slug)

	const lockResult3 = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(lockResult3, card.slug)
})

ava('.lock() should not let a user lock a card it does not have access to', async (test) => {
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'role-user-johndoe',
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							anyOf: [
								{
									const: 'user'
								},
								{
									const: 'type'
								}
							]
						},
						type: {
							type: 'string',
							const: 'type'
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'locktest-1234',
			links: {},
			type: 'card@1.0.0',
			version: '1.0.0',
			tags: [],
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {}
		})

	const result = await test.context.kernel.getCardById(
		test.context.context, session.id, card.id)
	test.falsy(result)

	const lockResult = await test.context.kernel.lock(
		test.context.context, session.id,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.falsy(lockResult)
})

ava('.unlock() should not let a user unlock an unlocked card it does not have access to', async (test) => {
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'role-user-johndoe',
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							anyOf: [
								{
									const: 'user'
								},
								{
									const: 'type'
								}
							]
						},
						type: {
							type: 'string',
							const: 'type'
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'locktest-1234',
			links: {},
			type: 'card@1.0.0',
			version: '1.0.0',
			tags: [],
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {}
		})

	const result = await test.context.kernel.getCardById(
		test.context.context, session.id, card.id)
	test.falsy(result)

	const unlockResult = await test.context.kernel.unlock(
		test.context.context, session.id,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.falsy(unlockResult)
})

ava('.unlock() should not let a user unlock a locked card it does not have access to', async (test) => {
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'role-user-johndoe',
			type: 'role@1.0.0',
			version: '1.0.0',
			data: {
				read: {
					type: 'object',
					properties: {
						slug: {
							type: 'string',
							anyOf: [
								{
									const: 'user'
								},
								{
									const: 'type'
								}
							]
						},
						type: {
							type: 'string',
							const: 'type'
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

	const userCard = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: []
			}
		})

	const session = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			type: 'session@1.0.0',
			version: '1.0.0',
			data: {
				actor: userCard.id
			}
		})

	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'locktest-1234',
			links: {},
			type: 'card@1.0.0',
			version: '1.0.0',
			tags: [],
			markers: [],
			linked_at: {},
			requires: [],
			capabilities: [],
			created_at: new Date().toISOString(),
			updated_at: null,
			active: true,
			data: {}
		})

	const result = await test.context.kernel.getCardById(
		test.context.context, session.id, card.id)
	test.falsy(result)

	const lockResult = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(lockResult, 'locktest-1234')

	const unlockResult = await test.context.kernel.unlock(
		test.context.context, session.id,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.falsy(unlockResult)
})

ava('.unlock() should be able to let other owner take the same slug', async (test) => {
	const card = {
		slug: 'locktest-1234',
		links: {},
		type: 'card@1.0.0',
		version: '1.0.0',
		tags: [],
		markers: [],
		linked_at: {},
		requires: [],
		capabilities: [],
		created_at: new Date().toISOString(),
		updated_at: null,
		active: true,
		data: {}
	}

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, card)

	const lockResult1 = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(lockResult1, card.slug)

	const unlockResult = await test.context.kernel.unlock(
		test.context.context, test.context.kernel.sessions.admin,
		'4a962ad9-20b5-4dd8-a707-bf819593cc84', card)
	test.is(unlockResult, card.slug)

	const lockResult2 = await test.context.kernel.lock(
		test.context.context, test.context.kernel.sessions.admin,
		'98853c0c-d055-4d25-a7be-682a2d5decc5', card)
	test.is(lockResult2, card.slug)
})

ava('.query() should return an unexecuted action request', async (test) => {
	const date = new Date()
	const request = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request@1.0.0',
			created_at: date.toISOString(),
			updated_at: null,
			linked_at: {},
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'action-request-1',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo@1.0.0',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card@1.0.0'
				},
				arguments: {}
			}
		})

	const result = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					pattern: '^action-request@'
				}
			}
		})

	test.deepEqual(result, [
		Object.assign({}, request, {
			updated_at: result[0].updated_at
		})
	])
})

ava('.query() should be able to limit', async (test) => {
	const date = new Date()
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request@1.0.0',
			created_at: date.toISOString(),
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'action-request-1',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo@1.0.0',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card@1.0.0'
				},
				arguments: {}
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request@1.0.0',
			created_at: date.toISOString(),
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'action-request-2',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo@1.0.0',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card@1.0.0'
				},
				arguments: {}
			}
		})

	const result1 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					pattern: '^action-request@'
				}
			}
		}, {
			limit: 1
		})

	test.is(result1.length, 1)

	const result2 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					pattern: '^action-request@'
				}
			}
		}, {
			limit: 1,
			skip: 1
		})

	test.is(result2.length, 1)
	test.not(result1[0].slug, result2[0].slug)
})

ava('.query() should be able to skip', async (test) => {
	const date = new Date()
	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request@1.0.0',
			created_at: date.toISOString(),
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'action-request-1',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo@1.0.0',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card@1.0.0'
				},
				arguments: {}
			}
		})

	await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'action-request@1.0.0',
			created_at: date.toISOString(),
			version: '1.0.0',
			active: true,
			tags: [],
			markers: [],
			links: {},
			requires: [],
			capabilities: [],
			slug: 'action-request-2',
			data: {
				epoch: date.valueOf(),
				timestamp: date.toISOString(),
				context: test.context.context,
				actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
				action: 'action-foo@1.0.0',
				input: {
					id: '98853c0c-d055-4d25-a7be-682a2d5decc5',
					type: 'card@1.0.0'
				},
				arguments: {}
			}
		})

	const result1 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					pattern: '^action-request@'
				}
			}
		}, {
			skip: 1
		})

	test.is(result1.length, 1)

	const result2 = await test.context.kernel.query(
		test.context.context, test.context.kernel.sessions.admin, {
			type: 'object',
			additionalProperties: true,
			required: [ 'type' ],
			$$links: {
				'is executed by': null
			},
			properties: {
				type: {
					type: 'string',
					pattern: '^action-request@'
				}
			}
		}, {
			skip: 0,
			limit: 1
		})

	test.is(result2.length, 1)
	test.not(result1[0].slug, result2[0].slug)
})

ava('.insertCard() should create a user with two email addressses', async (test) => {
	const card = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
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
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should not create a user with an invalid email', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'foo' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should not create a user with an invalid and a valid email', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'johndoe@example.com', 'foo' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), errors.JellyfishSchemaMismatch)
})

ava('.insertCard() should not create a user with duplicated emails', async (test) => {
	await test.throwsAsync(test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: 'user-johndoe',
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: [ 'johndoe@example.com', 'johndoe@example.com' ],
				hash: 'PASSWORDLESS',
				roles: []
			}
		}), errors.JellyfishSchemaMismatch)
})
