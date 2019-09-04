/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.before(helpers.sdk.beforeEach)
ava.after(helpers.sdk.afterEach)

// Logout of the SDK after each test
ava.afterEach(async (test) => {
	await test.context.sdk.auth.logout()
})

ava.serial('should sanely handle line breaks before tags in messages/whispers', async (test) => {
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

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `\n#${tagName}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName}`, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: 'tag'
	}))
})

ava.serial('should sanely handle multiple tags in messages/whispers', async (test) => {
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

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName1 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const tagName2 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const tagName3 = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `#${tagName1}\n#${tagName2}\n#${tagName3}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag1 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName1}`, {
			type: 'tag'
		})

	const tag2 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName2}`, {
			type: 'tag'
		})

	const tag3 = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName3}`, {
			type: 'tag'
		})

	test.deepEqual(tag1, test.context.jellyfish.defaults({
		created_at: tag1.created_at,
		data: {
			count: 1
		},
		id: tag1.id,
		linked_at: tag1.linked_at,
		name: tagName1,
		slug: tag1.slug,
		type: 'tag'
	}))

	test.deepEqual(tag2, test.context.jellyfish.defaults({
		created_at: tag2.created_at,
		data: {
			count: 1
		},
		id: tag2.id,
		linked_at: tag2.linked_at,
		name: tagName2,
		slug: tag2.slug,
		type: 'tag'
	}))

	test.deepEqual(tag3, test.context.jellyfish.defaults({
		created_at: tag3.created_at,
		data: {
			count: 1
		},
		id: tag3.id,
		linked_at: tag3.linked_at,
		name: tagName3,
		slug: tag3.slug,
		type: 'tag'
	}))
})

ava.serial('should create a new tag when one is found in a message', async (test) => {
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

	const thread = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			type: 'card',
			slug: test.context.generateRandomSlug({
				prefix: 'thread'
			}),
			version: '1.0.0',
			data: {}
		})

	const tagName = test.context.generateRandomSlug({
		prefix: 'test-tag'
	})

	const args = {
		slug: test.context.generateRandomSlug({
			prefix: 'whisper'
		}),
		tags: [],
		type: 'whisper',
		payload: {
			message: `#${tagName}`,
			alertsUser: [],
			mentionsUser: []
		}
	}

	await test.context.http(
		'POST', '/api/v2/action', {
			card: thread.id,
			type: thread.type,
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${session.id}`
		})

	const tag = await test.context.jellyfish.getCardBySlug(test.context.context,
		test.context.session, `tag-${tagName}`, {
			type: 'tag'
		})

	test.deepEqual(tag, test.context.jellyfish.defaults({
		created_at: tag.created_at,
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: 'tag'
	}))
})
