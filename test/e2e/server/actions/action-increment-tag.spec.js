/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const helpers = require('../../sdk/helpers')
const environment = require('../../../../lib/environment')

ava.before(async (test) => {
	await helpers.before(test)

	const session = await test.context.sdk.auth.login({
		username: environment.test.user.username,
		password: environment.test.user.password
	})

	test.context.token = session.id
})

ava.after(helpers.after)

ava.beforeEach(async (test) => {
	await helpers.beforeEach(test, test.context.token)
})

ava.afterEach(helpers.afterEach)

ava.serial('should create a new tag using using action-increment-tag', async (test) => {
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
			Authorization: `Bearer ${test.context.token}`
		})

	test.is(result.response.data.length, 1)

	const id = result.response.data[0].id
	const tag = await test.context.sdk.card.get(id)

	test.deepEqual(tag, {
		created_at: tag.created_at,
		updated_at: tag.updated_at,
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		capabilities: [],
		requires: [],
		data: {
			count: 1
		},
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag'
	})
})

ava.serial('action-increment-tag should not try two concurrent inserts', async (test) => {
	const headers = {
		Authorization: `Bearer ${test.context.token}`
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
			Authorization: `Bearer ${test.context.token}`
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
			Authorization: `Bearer ${test.context.token}`
		})

	const tag = await test.context.sdk.card.get(id)

	test.deepEqual(tag, {
		created_at: tag.created_at,
		data: {
			count: 2
		},
		updated_at: tag.updated_at,
		version: '1.0.0',
		active: true,
		links: {},
		markers: [],
		tags: [],
		capabilities: [],
		requires: [],
		id: tag.id,
		linked_at: tag.linked_at,
		name,
		slug: tag.slug,
		type: 'tag'
	})
})
