/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const uuid = require('uuid/v4')
const Front = require('front-sdk').Front
const helpers = require('./helpers')
const environment = require('../../../lib/environment')
const TOKEN = environment.integration.front

// Because Front might take a while to process
// message creation requests.
// See: https://dev.frontapp.com/#receive-custom-message
const retryWhile404 = async (fn, times = 5) => {
	try {
		return await fn()
	} catch (error) {
		if (error.status === 404 && times > 0) {
			await Bluebird.delay(500)
			return retryWhile404(fn, times - 1)
		}

		throw error
	}
}

const retryWhile429 = async (fn, times = 100) => {
	try {
		return await fn()
	} catch (error) {
		if (error.name === 'FrontError' && error.status === 429 && times > 0) {
			const delay = _.parseInt(_.first(error.message.match(/(\d+)/))) || 2000
			await Bluebird.delay(delay)
			return retryWhile429(fn, times - 1)
		}

		throw error
	}
}

const wait = async (fn, check, times = 8) => {
	const result = await fn()
	if (check(result)) {
		return result
	}

	if (times <= 0) {
		throw new Error('Timeout while waiting for check condition')
	}

	await Bluebird.delay(1000)
	return wait(fn, check, times - 1)
}

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
							pattern: '^https:\\/\\/api2\\.frontapp\\.com'
						}
					}
				}
			}
		}
	}
}

ava.serial.before(async (test) => {
	await helpers.mirror.before(test)

	if (TOKEN) {
		test.context.front = new Front(TOKEN.api)
	}

	test.context.inboxes = environment.test.integration.front.inboxes

	const teammates = await retryWhile429(() => {
		return test.context.front.inbox.listTeammates({
			inbox_id: test.context.inboxes[0]
		})
	})

	// Find the first available teammate for the tests
	// eslint-disable-next-line no-underscore-dangle
	const teammate = _.find(teammates._results, {
		is_available: true
	})
	if (!teammate) {
		throw new Error(`No available teammate for inbox ${test.context.inboxes[0]}`)
	}

	test.context.teammate = teammate.username

	test.context.getMessageSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'message'
		})
	}

	test.context.getWhisperSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'whisper'
		})
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

	test.context.createComment = async (target, slug, body) => {
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

	test.context.startSupportThread = async (title, description, inbox) => {
		// We need a "custom" channel in order to simulate an inbound
		const channels = await retryWhile429(() => {
			return test.context.front.inbox.listChannels({
				inbox_id: inbox
			})
		})

		// eslint-disable-next-line no-underscore-dangle
		const channel = _.find(channels._results, {
			type: 'custom'
		})
		if (!channel) {
			throw new Error('No custom channel to simulate inbound')
		}

		const inboundResult = await retryWhile429(() => {
			return test.context.front.message.receiveCustom({
				channel_id: channel.id,
				subject: title,
				body: description,
				sender: {
					handle: `jellytest-${uuid()}`
				}
			})
		})

		const message = await retryWhile404(async () => {
			return retryWhile429(() => {
				return test.context.front.message.get({
					// The "receive custom" endpoint gives us a uid,
					// while all the other endpoints take an id.
					// Front supports interpreting a uid as an id
					// using this alternate notation.
					message_id: `alt:uid:${inboundResult.message_uid}`
				})
			})
		})

		const remoteInbox = await retryWhile429(() => {
			return test.context.front.inbox.get({
				inbox_id: test.context.inboxes[0]
			})
		})

		const slug = test.context.generateRandomSlug({
			prefix: 'support-thread'
		})

		return test.context.executeThenWait(async () => {
			return test.context.sdk.card.create({
				name: title,
				slug,
				type: 'support-thread',
				version: '1.0.0',
				data: {
					// eslint-disable-next-line no-underscore-dangle
					mirrors: [ message._links.related.conversation ],
					environment: 'production',
					inbox: remoteInbox.name,
					mentionsUser: [],
					alertsUser: [],
					description,
					status: 'open'
				}
			})
		}, getMirrorWaitSchema(slug))
	}

	const listResourceUntil = async (fn, id, predicate, retries = 10) => {
		const result = await retryWhile429(() => {
			return fn({
				conversation_id: id
			})
		})

		// eslint-disable-next-line no-underscore-dangle
		const elements = result._results.filter((element) => {
			// Ignore webhook errors, as we know already that
			// we are not listening to them in these tests.
			return element.error_type !== 'webhook_timeout'
		})

		if (predicate(elements)) {
			return elements
		}

		if (retries <= 0) {
			throw new Error('Condition never true')
		}

		await Bluebird.delay(1000)
		return listResourceUntil(fn, id, predicate, retries - 1)
	}

	test.context.getFrontCommentsUntil = async (id, fn) => {
		return listResourceUntil(
			test.context.front.conversation.listComments, id, fn)
	}

	test.context.getFrontMessagesUntil = async (id, filter, fn) => {
		const results = await listResourceUntil(
			test.context.front.conversation.listMessages, id, (elements) => {
				return fn(_.filter(elements, filter))
			})

		return _.filter(results, filter)
	}
})

ava.serial.after(helpers.mirror.after)
ava.serial.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(test, test.context.teammate.replace(/_/g, '-'))
})

ava.serial.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no Front token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.serial.skip : ava.serial

avaTest('should close a thread with a #summary whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	test.is(supportThread.data.status, 'open')

	await test.context.createComment(supportThread,
		test.context.getWhisperSlug(), '#summary Foo Bar')

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')

	const id = _.last(supportThread.data.mirrors[0].split('/'))

	await wait(() => {
		return retryWhile429(() => {
			return test.context.front.conversation.get({
				conversation_id: id
			})
		})
	}, (conversation) => {
		return conversation.status === 'archived'
	})

	// Check that it remains closed after a while
	await Bluebird.delay(5000)

	const conversation = await retryWhile429(() => {
		return test.context.front.conversation.get({
			conversation_id: id
		})
	})

	test.is(conversation.status, 'archived')

	const threadAfter = await test.context.sdk.getById(supportThread.id)
	test.true(threadAfter.active)
	test.is(threadAfter.data.status, 'closed')
})

avaTest('should re-open a closed support thread if an attached issue is closed', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

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

	const conversationId = _.last(supportThread.data.mirrors[0].split('/'))

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const remoteConversationBefore = await retryWhile429(() => {
		return test.context.front.conversation.get({
			conversation_id: conversationId
		})
	})

	test.is(remoteConversationBefore.status, 'archived')

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

	const remoteConversationAfter = await retryWhile429(() => {
		return test.context.front.conversation.get({
			conversation_id: conversationId
		})
	})

	test.is(remoteConversationAfter.status, 'unassigned')
})

avaTest('should be able to reply to a moved inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Moved Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	const conversationId = _.last(supportThread.data.mirrors[0].split('/'))

	await retryWhile429(() => {
		return test.context.front.conversation.update({
			conversation_id: conversationId,
			inbox_id: test.context.inboxes[1]
		})
	})

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Message in another inbox')

	const messages = await test.context.getFrontMessagesUntil(conversationId, {
		is_draft: false
	}, (elements) => {
		return elements.length > 1
	})

	test.is(messages.length, 2)
	test.is(messages[0].body, '<p>Message in another inbox</p>\n')
	test.is(messages[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

/*
 * We need to have a custom channel on the test inbox in
 * order to simulate incoming messages.
 * Before this test will pass, we need to be able to
 * reply to messages using custom channels.
 *
 * Looks like just adding a random URL to the "Outgoing"
 * section of the custom channel configuration makes it
 * all work (?)
 */
avaTest('should be able to reply to an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'First message')

	const messages = await test.context.getFrontMessagesUntil(
		_.last(supportThread.data.mirrors[0].split('/')), {
			is_draft: false
		}, (elements) => {
			return elements.length > 1
		})

	test.is(messages.length, 2)
	test.is(messages[0].body, '<p>First message</p>\n')
	test.is(messages[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to post a complex code comment', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	// eslint-disable-next-line max-len
	const message = 'One last piece of the puzzle is to get the image url to pull. To get that you can run this from the browser console or sdk. \n\n`(await sdk.pine.get({ resource: \'release\', id: <release-id>, options: { $expand: { image__is_part_of__release: { $expand: { image: { $select: [\'is_stored_at__image_location\'] } } }} } })).image__is_part_of__release.map(({ image }) => image[0].is_stored_at__image_location )`\n'

	await test.context.createComment(supportThread,
		test.context.getWhisperSlug(), message)

	const comments = await test.context.getFrontCommentsUntil(
		_.last(supportThread.data.mirrors[0].split('/')), (elements) => {
			return elements.length > 0
		})

	test.true(comments.length > 0)
	test.is(comments[0].body, message)
	test.is(comments[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to comment using triple backticks', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.createComment(supportThread,
		test.context.getWhisperSlug(), '```Foo\nBar```')

	const comments = await test.context.getFrontCommentsUntil(
		_.last(supportThread.data.mirrors[0].split('/')), (elements) => {
			return elements.length > 0
		})

	test.true(comments.length > 0)
	test.is(comments[0].body, '```Foo\nBar```')
	test.is(comments[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to comment using brackets', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.createComment(supportThread,
		test.context.getWhisperSlug(), 'Hello <world> foo <bar>')
	const comments = await test.context.getFrontCommentsUntil(
		_.last(supportThread.data.mirrors[0].split('/')), (elements) => {
			return elements.length > 0
		})

	test.true(comments.length > 0)
	test.is(comments[0].body, 'Hello <world> foo <bar>')
	test.is(comments[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to tag an unassigned conversation', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	const id = _.last(supportThread.data.mirrors[0].split('/'))
	await retryWhile429(() => {
		return test.context.front.conversation.update({
			conversation_id: id,
			tags: [],
			assignee_id: null
		})
	})

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/tags',
			value: [ 'foo' ]
		}
	])

	const result = await wait(() => {
		return retryWhile429(() => {
			return test.context.front.conversation.get({
				conversation_id: id
			})
		})
	}, (conversation) => {
		return conversation.tags.length > 0
	})

	test.deepEqual(_.map(result.tags, 'name'), [ 'foo' ])
})

avaTest('should be able to comment on an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.createComment(supportThread,
		test.context.getWhisperSlug(), 'First comment')
	const comments = await test.context.getFrontCommentsUntil(
		_.last(supportThread.data.mirrors[0].split('/')), (elements) => {
			return elements.length > 0
		})

	test.is(comments.length, 2)
	test.is(comments[0].body, 'First comment')
	test.is(comments[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to close an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const result = await wait(() => {
		return retryWhile429(() => {
			return test.context.front.conversation.get({
				conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
			})
		})
	}, (conversation) => {
		return conversation.status === 'archived'
	})

	test.is(result.status, 'archived')
})

avaTest('should be able to archive an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'archived'
		}
	])

	const result = await wait(() => {
		return retryWhile429(() => {
			return test.context.front.conversation.get({
				conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
			})
		})
	}, (conversation) => {
		return conversation.status === 'archived'
	})

	test.is(result.status, 'archived')
})
