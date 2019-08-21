/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const permissionFilter = require('../../../lib/core/permission-filter')
const errors = require('../../../lib/core/errors')
const CARDS = require('../../../lib/core/cards')
const helpers = require('./helpers')

ava.beforeEach(helpers.kernel.beforeEach)
ava.afterEach(helpers.kernel.afterEach)

ava('.getSessionUser() should throw if the session is invalid', async (test) => {
	await test.throwsAsync(permissionFilter.getSessionUser(
		test.context.context, test.context.backend, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
			user: 'cards',
			session: 'sessions'
		}), errors.JellyfishInvalidSession)
})

ava('.getSessionUser() should throw if the session actor is invalid', async (test) => {
	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishNoElement)
})

ava('.getSessionUser() should get the session user given the session did not expire', async (test) => {
	const result = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'foo', 'bar' ]
		}
	})

	const date = new Date()
	date.setDate(date.getDate() + 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: result.id,
			expiration: date.toISOString()
		}
	})

	const user = await permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	})

	test.deepEqual(user, Object.assign({
		id: result.id
	}, user))
})

ava('.getSessionUser() should throw if the session expired', async (test) => {
	const user = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: 'user-johndoe',
		type: 'user',
		version: '1.0.0',
		data: {
			email: 'johndoe@example.com',
			roles: [ 'foo', 'bar' ]
		}
	})

	const date = new Date()
	date.setDate(date.getDate() - 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session',
		version: '1.0.0',
		data: {
			actor: user.id,
			expiration: date.toISOString()
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), errors.JellyfishSessionExpired)
})

ava('.getViewSchema() should return null if the card is not a view', (test) => {
	const schema = permissionFilter.getViewSchema(CARDS['user-admin'])
	test.deepEqual(schema, null)
})

ava('.getViewSchema() should preserve template interpolations in user properties', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					foo: {
						type: 'string',
						const: {
							$eval: 'user.slug'
						}
					}
				},
				required: [ 'foo' ]
			}
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: 'string',
				const: {
					$eval: 'user.slug'
				}
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getViewSchema() should preserve template interpolations in schema properties', (test) => {
	const schema = permissionFilter.getViewSchema(test.context.kernel.defaults({
		type: 'view',
		version: '1.0.0',
		data: {
			schema: {
				type: 'object',
				properties: {
					foo: {
						type: {
							$eval: 'user.type'
						}
					}
				},
				required: [ 'foo' ]
			}
		}
	}))

	test.deepEqual(schema, {
		type: 'object',
		properties: {
			foo: {
				type: {
					$eval: 'user.type'
				}
			}
		},
		required: [ 'foo' ]
	})
})

ava('.getViewSchema() should return null given a view card with no filters', (test) => {
	const schema = permissionFilter.getViewSchema({
		type: 'view',
		version: '1.0.0',
		data: {}
	})

	test.deepEqual(schema, null)
})
