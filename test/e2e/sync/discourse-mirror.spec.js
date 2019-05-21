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
const TOKEN = environment.getIntegrationToken('discourse')

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

	test.context.getTopic = async (id) => {
		return new Bluebird((resolve, reject) => {
			request({
				method: 'GET',
				baseUrl: 'https://forums.balena.io',
				json: true,
				uri: `/t/${id}.json`,
				qs: {
					api_key: TOKEN.api,
					api_username: TOKEN.username
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
				qs: {
					api_key: TOKEN.api,
					api_username: username
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
const avaTest = TOKEN ? ava.serial : ava.serial.skip

avaTest('should re-open a closed support thread if an attached issue is closed', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My closed issue topic ${uuid()}`,
		`Foo Bar ${uuid()}`)

	const issue = await test.context.sdk.card.create({
		name: 'My issue',
		slug: `issue-link-test-${uuid()}`,
		type: 'issue',
		version: '1.0.0',
		data: {
			repository: 'balena-io/jellyfish-test-github',
			description: 'Foo bar',
			status: 'open',
			mentionsUser: [],
			alertsUser: []
		}
	})

	await test.context.sdk.card.link(
		supportThread, issue, 'support thread has attached issue')

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

	const mirrorId = supportThread.data.mirrors[0]
	const topicBefore = await test.context.getTopic(_.last(mirrorId.split('/')))

	test.falsy(topicBefore.deleted_at)
	test.false(topicBefore.closed)
	test.true(topicBefore.visible)

	await test.context.sdk.card.update(issue.id, {
		type: issue.type,
		data: {
			status: 'closed'
		}
	})

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
		`My summary issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

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
		`My re-tagged issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await helpers.mirror.beforeEach(
		test, environment.test.integration.discourse.username)

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			tags: []
		}
	})

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
	const firstPost = topic.post_stream.posts[0]
	test.is(firstPost.updated_at, firstPost.created_at)
})

avaTest('should not re-open a closed thread by marking a message as read', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	const message = await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Hello')

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

	await test.context.sdk.card.update(message.id, {
		type: message.type,
		data: {
			readBy: [ 'johndoe' ]
		}
	})

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

avaTest('should fail with a user error if posting an invalid message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'archived'
		}
	})

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'archived'
		}
	})

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			tags: [ 'foo' ]
		}
	})

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			tags: []
		}
	})

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [])
})

avaTest('should add a thread tag', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			tags: [ 'foo' ]
		}
	})

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.deepEqual(topic.tags, [ 'foo' ])
})

avaTest('should not sync top level tags', async (test) => {
	const supportThread = await test.context.startSupportThread(
		test.context.username,
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		tags: [ 'foo' ]
	})

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

	await test.context.sdk.card.update(whisper.id, {
		type: whisper.type,
		data: {
			payload: {
				message: 'Edited whisper'
			}
		}
	})

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
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`)

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

	await test.context.sdk.card.update(message.id, {
		type: message.type,
		data: {
			payload: {
				message: 'Edited comment'
			}
		}
	})

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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		name: newTitle
	})

	const mirrorId = supportThread.data.mirrors[0]
	const topic = await test.context.getTopic(_.last(mirrorId.split('/')))
	test.is(topic.title, newTitle)
})
