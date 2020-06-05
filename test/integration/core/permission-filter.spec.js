/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const permissionFilter = require('../../../lib/core/permission-filter')
const errors = require('../../../lib/core/errors')
const helpers = require('./helpers')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava('.getSessionUser() should throw if the session is invalid', async (test) => {
	await test.throwsAsync(permissionFilter.getSessionUser(
		test.context.context, test.context.backend, '4a962ad9-20b5-4dd8-a707-bf819593cc84', {
			user: 'cards',
			session: 'sessions'
		}), {
		instanceOf: errors.JellyfishInvalidSession
	})
})

ava('.getSessionUser() should throw if the session actor is invalid', async (test) => {
	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: '4a962ad9-20b5-4dd8-a707-bf819593cc84'
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), {
		instanceOf: errors.JellyfishNoElement
	})
})

ava('.getSessionUser() should get the session user given the session did not expire', async (test) => {
	const result = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'foo', 'bar' ]
			}
		})

	const date = new Date()
	date.setDate(date.getDate() + 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
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
	const user = await test.context.kernel.insertCard(
		test.context.context, test.context.kernel.sessions.admin, {
			slug: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			version: '1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'foo', 'bar' ]
			}
		})

	const date = new Date()
	date.setDate(date.getDate() - 1)

	const session = await test.context.kernel.insertCard(test.context.context, test.context.kernel.sessions.admin, {
		slug: test.context.generateRandomSlug({
			prefix: 'session'
		}),
		type: 'session@1.0.0',
		version: '1.0.0',
		data: {
			actor: user.id,
			expiration: date.toISOString()
		}
	})

	await test.throwsAsync(permissionFilter.getSessionUser(test.context.context, test.context.backend, session.id, {
		user: 'cards',
		session: 'sessions'
	}), {
		instanceOf: errors.JellyfishSessionExpired
	})
})
