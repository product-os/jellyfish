/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../sdk/helpers')

ava.serial.before(async (test) => {
	await helpers.before(test)
	test.context.waitForTag = (tagName) => {
		return test.context.waitForMatch({
			type: 'object',
			required: [ 'slug' ],
			properties: {
				slug: {
					type: 'string',
					const: tagName
				}
			}
		})
	}
})
ava.serial.after(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach(helpers.afterEach)

ava.serial('should sanely handle line breaks before tags in messages/whispers', async (test) => {
	const thread = await test.context.sdk.card.create({
		type: 'card@1.0.0',
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
			action: 'action-create-event@1.0.0',
			arguments: args
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	const tag = await test.context.waitForTag(`tag-${tagName}`)

	test.deepEqual(tag, {
		created_at: tag.created_at,
		updated_at: tag.updated_at,
		version: '1.0.0',
		active: true,
		markers: [],
		links: {},
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: tag.type
	})
})

ava.serial('should sanely handle multiple tags in messages/whispers', async (test) => {
	const thread = await test.context.sdk.card.create({
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
			action: 'action-create-event@1.0.0',
			arguments: args
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	const tag1 = await test.context.waitForTag(`tag-${tagName1}`)
	const tag2 = await test.context.waitForTag(`tag-${tagName2}`)
	const tag3 = await test.context.waitForTag(`tag-${tagName3}`)

	test.deepEqual(tag1, {
		created_at: tag1.created_at,
		updated_at: tag1.updated_at,
		version: '1.0.0',
		active: true,
		markers: [],
		links: {},
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			count: 1
		},
		id: tag1.id,
		linked_at: tag1.linked_at,
		name: tagName1,
		slug: tag1.slug,
		type: tag1.type
	})

	test.deepEqual(tag2, {
		created_at: tag2.created_at,
		updated_at: tag2.updated_at,
		version: '1.0.0',
		active: true,
		markers: [],
		links: {},
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			count: 1
		},
		id: tag2.id,
		linked_at: tag2.linked_at,
		name: tagName2,
		slug: tag2.slug,
		type: tag2.type
	})

	test.deepEqual(tag3, {
		created_at: tag3.created_at,
		updated_at: tag3.updated_at,
		version: '1.0.0',
		active: true,
		markers: [],
		links: {},
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			count: 1
		},
		id: tag3.id,
		linked_at: tag3.linked_at,
		name: tagName3,
		slug: tag3.slug,
		type: tag3.type
	})
})

ava.serial('should create a new tag when one is found in a message', async (test) => {
	const thread = await test.context.sdk.card.create({
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
			action: 'action-create-event@1.0.0',
			arguments: args
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	const tag = await test.context.waitForTag(`tag-${tagName}`)

	test.deepEqual(tag, {
		created_at: tag.created_at,
		updated_at: tag.updated_at,
		version: '1.0.0',
		active: true,
		markers: [],
		links: {},
		tags: [],
		requires: [],
		capabilities: [],
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name: tagName,
		slug: tag.slug,
		type: tag.type
	})
})
