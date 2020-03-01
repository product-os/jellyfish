/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const request = require('request')
const uuid = require('uuid/v4')
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const utils = require('../../../lib/sync/integrations/utils')
const randomWords = require('random-words')
const TOKEN = environment.integration.discourse

const getMirrorWaitSchema = (slug) => {
	return {
		type: 'object',
		required: [ 'id', 'type', 'slug', 'data' ],
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string'
			},
			slug: {
				type: 'string',
				const: slug
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: [ 'mirrors' ],
				properties: {
					mirrors: {
						type: 'array',
						items: {
							type: 'string',
							pattern: '^https:\\/\\/forums\\.balena\\.io'
						}
					}
				}
			}
		}
	}
}
const generateRandomWords = (number) => {
	return randomWords(number).join(' ')
}

ava.before(async (test) => {
	await helpers.mirror.before(test)
	test.context.category = environment.test.integration.discourse.category

	test.context.getWhisperSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'whisper'
		})
	}

	test.context.getMessageSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'message'
		})
	}

	test.context.createWhisper = async (target, slug, body) => {
		return test.context.executeThenWait(async () => {
			return test.context.sdk.event.create({
				slug,
				target,
				type: 'whisper',
				payload: {
					mentionsUser: [],
					alertsUser: [],
					message: body
				}
			})
		}, getMirrorWaitSchema(slug))
	}

	test.context.createMessage = async (target, slug, body) => {
		return test.context.executeThenWait(async () => {
			return test.context.sdk.event.create({
				slug,
				target,
				type: 'message',
				payload: {
					mentionsUser: [],
					alertsUser: [],
					message: body
				}
			})
		}, getMirrorWaitSchema(slug))
	}

	test.context.deleteTopic = async (id) => {
		return new Bluebird((resolve, reject) => {
			request({
				method: 'DELETE',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: `/t/${id}.json`,
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': TOKEN.username
				}
			}, (error, response, body) => {
				if (error) {
					return reject(error)
				}

				if (response.statusCode === 429) {
					return test.context.deleteTopic(id)
						.then(resolve)
						.catch(reject)
				}

				if (response.statusCode !== 200) {
					return reject(new Error(
						`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`))
				}

				return resolve()
			})
		})
	}

	test.context.getTopic = async (id) => {
		return new Bluebird((resolve, reject) => {
			request({
				method: 'GET',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: `/t/${id}.json`,
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': TOKEN.username
				}
			}, (error, response, body) => {
				if (error) {
					return reject(error)
				}

				if (response.statusCode === 429) {
					return test.context.getTopic(id)
						.then(resolve)
						.catch(reject)
				}

				if (response.statusCode === 404) {
					return resolve(null)
				}

				if (response.statusCode !== 200) {
					return reject(new Error(
						`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`))
				}

				return resolve(body)
			})
		})
	}

	const createSupportThread = async (username, title, description) => {
		return new Bluebird((resolve, reject) => {
			request({
				method: 'POST',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: '/posts.json',
				body: {
					title,
					raw: description,
					category: _.parseInt(test.context.category)
				},
				headers: {
					'Api-Key': TOKEN.api,
					'Api-Username': username
				}
			}, (error, response, body) => {
				if (error) {
					return reject(error)
				}

				if (response.statusCode === 429) {
					return createSupportThread(username, title, description)
						.then(resolve)
						.catch(reject)
				}

				if (response.statusCode !== 200) {
					return reject(new Error(
						`Got ${response.statusCode}: ${JSON.stringify(body, null, 2)}`))
				}

				return resolve(body)
			})
		})
	}

	test.context.startSupportThread = async (username, title, description) => {
		const post = await createSupportThread(username, title, description)
		const slug = test.context.generateRandomSlug({
			prefix: 'support-thread-discourse-test'
		})

		if (!post.topic_id) {
			throw new Error(`No topic id in post: ${JSON.stringify(post, null, 2)}`)
		}

		const result = await test.context.sdk.card.create({
			name: title,
			slug,
			type: 'support-thread',
			version: '1.0.0',
			data: {
				mirrors: [ `https://forums.balena.io/t/${post.topic_id}` ],
				environment: 'production',
				inbox: 'S/Forums',
				mentionsUser: [],
				alertsUser: [],
				description: '',
				status: 'open'
			}
		})

		return test.context.sdk.getById(result.id, {
			type: 'support-thread'
		})
	}
})

ava.after(helpers.mirror.after)
ava.beforeEach(async (test) => {
	await helpers.mirror.beforeEach(
		test, environment.integration.discourse.username)
})

ava.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no Discourse token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava.serial

avaTest('should send, but not sync, a whisper to a deleted thread', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My deleted summary issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const eventResponse = await test.context.sdk.event.create({
		slug: test.context.getWhisperSlug(),
		target: supportThread,
		type: 'whisper',
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message: '#summary Foo Bar'
		}
	})

	// Give it some time to make sure that no syncing took place
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(eventResponse.id)
	test.falsy(thread.data.mirrors)

	const topic = await test.context.getTopic(topicId)
	test.is(topic.post_stream.posts.length, 1)
})

avaTest('should send, but not sync, a message to a deleted thread', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My deleted summary issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const eventResponse = await test.context.sdk.event.create({
		slug: test.context.getMessageSlug(),
		target: supportThread,
		type: 'message',
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message: 'Test message'
		}
	})

	// Give it some time to make sure that no syncing took place
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(eventResponse.id)
	test.falsy(thread.data.mirrors)

	const topic = await test.context.getTopic(topicId)
	test.is(topic.post_stream.posts.length, 1)
})

avaTest('should send a whisper as a non moderator user', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)
	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), 'First whisper')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.not(test.context.username, lastPost.username)
	test.is(environment.integration.discourse.username, lastPost.username)
	const baseUrl = 'https://forums.balena.io'
	test.is(utils.parseHTML(lastPost.cooked, {
		baseUrl
	}), [
		`(${test.context.username}) First whisper`,
		'',
		'* * *',
		'',
		[
			'> This message was posted as',
			`[@${lastPost.username}](${baseUrl}/u/${lastPost.username}) because`,
			`[@${test.context.username}](${baseUrl}/u/${test.context.username})`,
			'is not a Discourse moderator'
		].join(' ')
	].join('\n'))
	test.is(lastPost.post_type, 4)

	await helpers.mirror.afterEach(test)
})

avaTest('should send a message as a non moderator user', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)
	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'First comment')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(utils.parseHTML(lastPost.cooked), 'First comment')
	test.is(lastPost.post_type, 1)

	await helpers.mirror.afterEach(test)
})

avaTest('should re-open a closed support thread if an attached issue is closed', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const issue = await test.context.sdk.card.create({
		name: 'My issue',
		slug: `issue-link-test-${uuid()}`,
		type: 'issue',
		version: '1.0.0',
		data: {
			repository: 'product-os/jellyfish-test-github',
			description: 'Foo bar',
			status: 'open',
			mentionsUser: [],
			alertsUser: []
		}
	})

	await test.context.sdk.card.link(
		supportThread, issue, 'support thread is attached to issue')

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	test.falsy(topicBefore.deleted_at)
	test.false(topicBefore.closed)
	test.true(topicBefore.visible)

	await test.context.sdk.card.update(issue.id, issue.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const newSupportThread =
		await test.context.sdk.card.get(supportThread.id)

	test.is(newSupportThread.data.status, 'open')

	const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))

	// We never close remote topics
	test.falsy(topicAfter.deleted_at)
	test.false(topicAfter.closed)
	test.true(topicAfter.visible)
})

avaTest('should not update a post by posting a #summary whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), '#summary Foo Bar')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const firstPost = topic.post_stream.posts[0]
	test.is(firstPost.updated_at, firstPost.created_at)
})

avaTest('should not update a post by defining no new tags', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: []
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
	const firstPost = topic.post_stream.posts[0]
	test.is(firstPost.updated_at, firstPost.created_at)
})

avaTest('should not re-open a closed thread by marking a message as read', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const message = await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Hello')

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'add',
			path: '/data/readBy',
			value: [ 'johndoe' ]
		}
	])

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

avaTest('should fail with a user error if posting an invalid message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const error = await test.throwsAsync(test.context.createMessage(supportThread,
		test.context.getMessageSlug(), '.'))
	test.is(error.name, 'SyncInvalidRequest')
	test.true(error.expected)
})

avaTest('should not re-open a closed thread with a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), 'Hello')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

avaTest('should not re-open an archived thread with a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'archived'
		}
	])

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), 'Hello')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'archived')
})

avaTest('should re-open a closed thread with a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Hello')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'open')
})

avaTest('should re-open an archived thread with a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'archived'
		}
	])

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Hello')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'open')
})

avaTest('should close a thread with a #summary whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	test.is(supportThread.data.status, 'open')

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), '#summary Foo Bar')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))

	// We will not close the remote thread as this is an internal thing
	test.truthy(topic.visible)
	test.falsy(topic.closed)
	test.falsy(topic.archived)
	test.falsy(topic.deleted_by)
	test.falsy(topic.deleted_at)
})

avaTest('should add and remove a thread tag', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: [ 'foo' ]
		}
	])

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: []
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
})

avaTest('should add a thread tag', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'add',
			path: '/data/tags',
			value: [ 'foo' ]
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [ 'foo' ])
})

avaTest('should not sync top level tags', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: [ 'foo' ]
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
})

avaTest('should send a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), 'First whisper')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(utils.parseHTML(lastPost.cooked), 'First whisper')
	test.is(lastPost.post_type, 4)
})

avaTest('should update a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	const whisper = await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), 'First whisper')

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	await test.context.sdk.card.update(whisper.id, whisper.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: 'Edited whisper'
		}
	])

	const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topicAfter.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(utils.parseHTML(lastPost.cooked), 'Edited whisper')
	test.is(lastPost.post_type, 4)
	test.is(topicBefore.post_stream.posts.length, topicAfter.post_stream.posts.length)
})

avaTest('should send a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'First comment')

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(utils.parseHTML(lastPost.cooked), 'First comment')
	test.is(lastPost.post_type, 1)
})

avaTest('should update a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	const message = await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'First comment')

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: 'Edited comment'
		}
	])

	const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topicAfter.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(utils.parseHTML(lastPost.cooked), 'Edited comment')
	test.is(lastPost.post_type, 1)
	test.is(topicBefore.post_stream.posts.length, topicAfter.post_stream.posts.length)
})

avaTest('should update the thread title', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	const newTitle = `New issue title ${uuid()}`

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/name',
			value: newTitle
		}
	])

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.is(topic.title, newTitle)
})
