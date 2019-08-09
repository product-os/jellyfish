/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const {
	stripIndent
} = require('common-tags')
const uuid = require('uuid/v4')
const helpers = require('../sdk/helpers')

ava.before(helpers.before)
ava.after(helpers.after)

ava.beforeEach(helpers.beforeEach)
ava.afterEach(helpers.afterEach)

const createUserDetails = () => {
	return {
		username: uuid(),
		email: `${uuid()}@example.com`,
		password: 'foobarbaz'
	}
}

ava.serial('should sanely handle line breaks before tags in messages/whispers', async (test) => {
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
			Authorization: `Bearer ${test.context.token}`
		})

	const tag = await test.context.sdk.card.get(`tag-${tagName}`)

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
		type: 'tag'
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
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	const tag1 = await test.context.sdk.card.get(`tag-${tagName1}`)
	const tag2 = await test.context.sdk.card.get(`tag-${tagName2}`)
	const tag3 = await test.context.sdk.card.get(`tag-${tagName3}`)

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
		type: 'tag'
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
		type: 'tag'
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
		type: 'tag'
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
			action: 'action-create-event',
			arguments: args
		}, {
			Authorization: `Bearer ${test.context.token}`
		})

	const tag = await test.context.sdk.card.get(`tag-${tagName}`)

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
		type: 'tag'
	})
})

ava.serial('Message markdown should be pre-processed into html', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	// Create a new user
	await test.context.createUser(userDetails)

	// Login as the new user
	await sdk.auth.login(userDetails)

	// Create a new thread element
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		name: 'test-thread',
		data: {}
	})

	const result = await sdk.event.create({
		type: 'message',
		tags: [],
		target: thread,
		payload: {
			message: '@lucianbuzzo\n >lorem ipsum dolor sit amet'
		}
	})

	const message = await sdk.card.get(result.id)

	test.deepEqual(
		message.data.payload.html.trim(),
		stripIndent `
			<p><span class="rendition-tag--hl rendition-tag--user-lucianbuzzo">@lucianbuzzo</span></p>
			<blockquote>
			<p>lorem ipsum dolor sit amet</p>
			</blockquote>
		`
	)
})

ava.serial('Whisper markdown should be pre-processed into html', async (test) => {
	const {
		sdk
	} = test.context

	const userDetails = createUserDetails()

	// Create a new user
	await test.context.createUser(userDetails)

	// Login as the new user
	await sdk.auth.login(userDetails)

	// Create a new thread element
	const thread = await sdk.card.create({
		type: 'thread',
		slug: test.context.generateRandomSlug({
			prefix: 'thread'
		}),
		version: '1.0.0',
		name: 'test-thread',
		data: {}
	})

	const result = await sdk.event.create({
		type: 'whisper',
		tags: [],
		target: thread,
		payload: {
			message: '@lucianbuzzo\n >lorem ipsum dolor sit amet'
		}
	})

	const whisper = await sdk.card.get(result.id)

	test.deepEqual(
		whisper.data.payload.html.trim(),
		stripIndent `
			<p><span class="rendition-tag--hl rendition-tag--user-lucianbuzzo">@lucianbuzzo</span></p>
			<blockquote>
			<p>lorem ipsum dolor sit amet</p>
			</blockquote>
		`
	)
})
