/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const helpers = require('../../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

ava.serial('should create a new tag using using action-increment-tag', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const name = test.context.generateRandomSlug({
		prefix: 'increment-tag-test'
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	test.is(result.response.data.length, 1)

	const id = result.response.data[0].id

	const tag = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, id, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag'
	}))
})

ava.serial('action-increment-tag should not try two concurrent inserts', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const headers = {
		Authorization: `Bearer ${session.id}`
	}

	for (const time of _.range(10)) {
		const options = {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name: test.context.generateRandomSlug({
					prefix: `increment-tag-test-${time}`
				})
			}
		}

		const results = await Bluebird.all([
			test.context.http('POST', '/api/v2/action', options, headers),
			test.context.http('POST', '/api/v2/action', options, headers)
		])

		test.deepEqual(_.reject(results, {
			code: 200
		}), [])
	}
})

ava.serial('should increment an existing tag using using action-increment-tag', async (test) => {
	const admin = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user-admin', {
			type: 'user'
		})

	const session = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'session',
			slug: test.context.generateRandomSlug({
				prefix: 'session'
			}),
			version: '1.0.0',
			data: {
				actor: admin.id
			}
		})

	const name = test.context.generateRandomSlug({
		prefix: 'increment-tag-test'
	})

	const result = await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-create-card',
			arguments: {
				reason: null,
				properties: {
					name,
					slug: `tag-${name}`,
					data: {
						count: 1
					}
				}
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const id = result.response.data.id

	await test.context.http(
		'POST', '/api/v2/action', {
			card: 'tag',
			type: 'type',
			action: 'action-increment-tag',
			arguments: {
				reason: null,
				name
			}
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardById(test.context.context,
		test.context.session, id, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 2
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag',
		updated_at: tag.updated_at
	}))
})
