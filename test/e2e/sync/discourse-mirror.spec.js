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
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const randomWords = require('random-words')
const TOKEN = environment.integration.discourse

const getMirrorWaitSchema = (slug) => {
	return {
		type: 'object',
		required: [ 'slug', 'data' ],
		properties: {
			slug: {
				type: 'string',
				const: slug
			},
			data: {
				type: 'object',
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

	test.context.createWhisper = async (target, body) => {
		const whisper = await test.context.sdk.event.create({
			target,
			type: 'whisper',
			payload: {
				message: body
			}
		})
		return test.context.waitForMatch(getMirrorWaitSchema(whisper.slug))
	}

	test.context.createMessage = async (target, body) => {
		const message = await test.context.sdk.event.create({
			target,
			type: 'message',
			payload: {
				message: body
			}
		})

		return test.context.waitForMatch(getMirrorWaitSchema(message.slug))
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

	test.context.startSupportThread = async (username) => {
		const title = generateRandomWords(5)
		const description = generateRandomWords(10)

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

		return test.context.sdk.getById(result.id)
	}
})

ava.after.always(helpers.mirror.after)

ava.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(
		test, environment.integration.discourse.username)
})

ava.afterEach.always(helpers.mirror.afterEach)

// Skip all tests if there is no Discourse token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) || environment.test.integration.skip ? ava.skip : ava

avaTest('should send, but not sync, a whisper to a deleted thread', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const message = generateRandomWords(5)

	const eventResponse = await test.context.sdk.event.create({
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
	const supportThread = await test.context.startSupportThread(test.context.username)

	const mirrorId = supportThread.data.mirrors[0]
	const topicId = _.last(mirrorId.split('/'))
	await test.context.deleteTopic(topicId)

	const message = 'Test message'

	const eventResponse = await test.context.sdk.event.create({
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
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(50)

	// Switch to a non-moderator user for the SDK session
	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)

	const whisper = await test.context.createWhisper(supportThread, content)
	const postNumber = parseInt(whisper.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.find(topic.post_stream.posts, {
		post_number: postNumber
	})

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
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(50)

	// Switch to a non-moderator user for the SDK session
	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.nonModeratorUsername)

	const message = await test.context.createMessage(supportThread, content)
	const postNumber = parseInt(message.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.find(topic.post_stream.posts, {
		post_number: postNumber
	})

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
	test.is(lastPost.post_type, 1)

	await helpers.mirror.afterEach(test)
})

avaTest('should not update a post by defining no new tags', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

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

avaTest('should add and remove a thread tag', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

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
	const supportThread = await test.context.startSupportThread(test.context.username)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'add',
			path: '/data/tags',
			value: [ 'foo' ]
		}
	])

	const mirrorId = supportThread.data.mirrors[0]

	await test.context.retry(() => {
		return test.context.getTopic(_.last(mirrorId.split('/')))
	}, (topic) => {
		return _.isEqual(topic.tags, [ 'foo' ])
	})

	test.pass()
})

avaTest('should not sync top level tags', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: [ 'foo' ]
		}
	])

	// Wait to make sure no syncing happens
	await Bluebird.delay(5000)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
})

avaTest('should send a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(50)
	const whisper = await test.context.createWhisper(supportThread, content)
	const postNumber = parseInt(whisper.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]

	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))

	const lastPost = _.find(topic.post_stream.posts, {
		post_number: postNumber
	})

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
	test.is(lastPost.post_type, 4)
})

avaTest('should update a whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(10)
	const whisper = await test.context.createWhisper(supportThread, content)
	const postNumber = parseInt(whisper.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]

	const newContent = generateRandomWords(10)
	await test.context.sdk.card.update(whisper.id, whisper.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: newContent
		}
	])

	await test.context.retry(async () => {
		const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
		const lastPost = _.find(topicAfter.post_stream.posts, {
			post_number: postNumber
		})
		return lastPost
	}, (lastPost) => {
		return _.isEqual(test.context.username, lastPost.username) &&
			_.isEqual(lastPost.cooked, `<p>${newContent}</p>`) &&
			_.isEqual(lastPost.post_type, 4)
	})

	test.pass()
})

avaTest('should send a message', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(50)
	const message = await test.context.createMessage(supportThread, content)
	const postNumber = parseInt(message.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	const lastPost = _.find(topic.post_stream.posts, {
		post_number: postNumber
	})

	test.is(test.context.username, lastPost.username)
	test.is(lastPost.cooked, `<p>${content}</p>`)
	test.is(lastPost.post_type, 1)
})

avaTest('should update a message', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const content = generateRandomWords(50)
	const message = await test.context.createMessage(supportThread, content)
	const postNumber = parseInt(message.data.mirrors[0].split('/').pop(), 10)

	const mirrorId = supportThread.data.mirrors[0]

	const newContent = generateRandomWords(50)
	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'replace',
			path: '/data/payload/message',
			value: newContent
		}
	])

	await test.context.retry(async () => {
		const topicAfter = await test.context.getTopic(_.last(mirrorId.split('/')))
		const lastPost = _.find(topicAfter.post_stream.posts, {
			post_number: postNumber
		})
		return lastPost
	}, (lastPost) => {
		return _.isEqual(test.context.username, lastPost.username) &&
			_.isEqual(lastPost.cooked, `<p>${newContent}</p>`) &&
			_.isEqual(lastPost.post_type, 1)
	})

	test.pass()
})

avaTest('should update the thread title', async (test) => {
	const supportThread = await test.context.startSupportThread(test.context.username)

	const newTitle = `${generateRandomWords(10)} ${uuid()}`

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/name',
			value: newTitle
		}
	])

	const mirrorId = supportThread.data.mirrors[0]

	await test.context.retry(() => {
		return test.context.getTopic(_.last(mirrorId.split('/')))
	}, (topic) => {
		return _.isEqual(topic.title, newTitle)
	})

	test.pass()
})
