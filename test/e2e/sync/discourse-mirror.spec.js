/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const request = require('request')
const {
	v4: uuid
} = require('uuid')
const helpers = require('./helpers')
const environment = require('@balena/jellyfish-environment')
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

ava.serial.before(async (test) => {
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
				uri: `/t/${id}.json?include_raw=1`,
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

ava.serial.after(helpers.mirror.after)
ava.serial.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(
		test, environment.integration.discourse.username)
})

ava.serial.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no Discourse token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.skip : ava.serial

avaTest('should send, but not sync, a whisper to a deleted thread', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const message = '#summary Foo Bar'

	const eventResponse = await test.context.sdk.event.create({
		slug: test.context.getWhisperSlug(),
		target: supportThread,
		type: 'whisper',
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message
		}
	})

	// Give it some time to make sure that no syncing took place
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(eventResponse.id)
	test.falsy(thread.data.mirrors)

	const topic = await test.context.getTopic(topicId)
	test.false(_.some(topic.post_stream.posts, {
		raw: message
	}))
})

avaTest('should send, but not sync, a message to a deleted thread', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const message = 'Test message'

	const eventResponse = await test.context.sdk.event.create({
		slug: test.context.getMessageSlug(),
		target: supportThread,
		type: 'message',
		payload: {
			mentionsUser: [],
			alertsUser: [],
			message
		}
	})

	// Give it some time to make sure that no syncing took place
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(eventResponse.id)
	test.falsy(thread.data.mirrors)

	const topic = await test.context.getTopic(topicId)
	test.false(_.some(topic.post_stream.posts, {
		raw: message
	}))
})

avaTest('should send a whisper as a non moderator user', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const content = generateRandomWords(50)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)
	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.not(test.context.username, lastPost.username)
	test.is(environment.integration.discourse.username, lastPost.username)
	test.is(lastPost.cooked, [
		`<p>(${test.context.username}) ${content}</p>`,
		'<hr>',
		'<blockquote>',
		[
			'<p>This message was posted as',
			`<a class="mention" href="/u/${lastPost.username}">@${lastPost.username}</a> because`,
			`<a class="mention" href="/u/${test.context.username}">@${test.context.username}</a>`,
			'is not a Discourse moderator</p>'
		].join(' '),
		'</blockquote>'
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

	const content = generateRandomWords(50)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)
	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
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

	// Close the issue, and then wait for the support thread to be re-opened
	const newSupportThread = await test.context.executeThenWait(async () => {
		return test.context.sdk.card.update(issue.id, issue.type, [
			{
				op: 'replace',
				path: '/data/status',
				value: 'closed'
			}
		])
	}, {
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				const: supportThread.id
			},
			data: {
				type: 'object',
				required: [ 'status' ],
				properties: {
					status: {
						const: 'open'
					}
				}
			}
		}
	})

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

	const content = generateRandomWords(50)

	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), `#summary ${content}`)

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

	const content = generateRandomWords(50)
	const message = await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), content)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const content = generateRandomWords(50)
	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), content)

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

avaTest('should not re-open an archived thread with a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'archived'
		}
	])

	const content = generateRandomWords(50)
	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), content)

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'open')
})

avaTest('should close a thread with a #summary whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	test.is(supportThread.data.status, 'open')

	const content = generateRandomWords(50)
	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), `#summary ${content}`)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

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
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const content = generateRandomWords(50)
	await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
	test.is(lastPost.post_type, 4)
})

avaTest('should update a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const content = generateRandomWords(50)
	const whisper = await test.context.createWhisper(supportThread,
		test.context.getWhisperSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	const newContent = generateRandomWords(50)
	await test.context.sdk.card.update(whisper.id, whisper.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: newContent
		}
	])

	const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topicAfter.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${newContent}</p>`)
	test.is(lastPost.post_type, 4)
	test.is(topicBefore.post_stream.posts.length, topicAfter.post_stream.posts.length)
})

avaTest('should send a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const content = generateRandomWords(50)
	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topic.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
	test.is(lastPost.post_type, 1)
})

avaTest('should update a message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const content = generateRandomWords(50)
	const message = await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), content)

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	const newContent = generateRandomWords(50)
	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: newContent
		}
	])

	const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.last(topicAfter.post_stream.posts)

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${newContent}</p>`)
	test.is(lastPost.post_type, 1)
	test.is(topicBefore.post_stream.posts.length, topicAfter.post_stream.posts.length)
})

avaTest('should update the thread title', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		generateRandomWords(5),
		generateRandomWords(10)
	)

	const newTitle = `${generateRandomWords(10)} ${uuid()}`

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
