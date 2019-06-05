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

ava.before(async (test) => {
	await helpers.mirror.before(test)

	if (TOKEN) {
		test.context.front = new Front(TOKEN.api)
	}

	test.context.inboxes = environment.test.integration.front.inboxes

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
		const channels = await test.context.front.inbox.listChannels({
			inbox_id: inbox
		})

		// eslint-disable-next-line no-underscore-dangle
		const channel = _.find(channels._results, {
			type: 'custom'
		})
		if (!channel) {
			throw new Error('No custom channel to simulate inbound')
		}

		const inboundResult = await test.context.front.message.receiveCustom({
			channel_id: channel.id,
			subject: title,
			body: description,
			sender: {
				handle: `jellytest-${uuid().slice(0, 4)}`
			}
		})

		const message = await retryWhile404(async () => {
			return test.context.front.message.get({
				// The "receive custom" endpoint gives us a uid,
				// while all the other endpoints take an id.
				// Front supports interpreting a uid as an id
				// using this alternate notation.
				message_id: `alt:uid:${inboundResult.message_uid}`
			})
		})

		const remoteInbox = await test.context.front.inbox.get({
			inbox_id: test.context.inboxes[0]
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
})

ava.after(helpers.mirror.after)
ava.beforeEach(async (test) => {
	const teammates = await test.context.front.inbox.listTeammates({
		inbox_id: test.context.inboxes[0]
	})

	// Find the first available teammate for the tests
	// eslint-disable-next-line no-underscore-dangle
	const teammate = _.find(teammates._results, {
		is_available: true
	})
	if (!teammate) {
		throw new Error(`No available teammate for inbox ${test.context.inboxes[0]}`)
	}

	await helpers.mirror.beforeEach(test, teammate.username.replace(/_/g, '-'))
})

ava.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no Front token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) ? ava.serial.skip : ava.serial

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
			repository: 'balena-io/jellyfish-test-github',
			description: 'Foo bar',
			status: 'open',
			mentionsUser: [],
			alertsUser: []
		}
	})

	await test.context.sdk.card.link(
		supportThread, issue, 'support thread has attached issue')

	const conversationId = _.last(supportThread.data.mirrors[0].split('/'))

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

	const remoteConversationBefore =
		await test.context.front.conversation.get({
			conversation_id: conversationId
		})

	test.is(remoteConversationBefore.status, 'archived')

	await test.context.sdk.card.update(issue.id, {
		type: issue.type,
		data: {
			status: 'closed'
		}
	})

	const newSupportThread =
		await test.context.sdk.card.get(supportThread.id)

	test.is(newSupportThread.data.status, 'open')

	const remoteConversationAfter =
		await test.context.front.conversation.get({
			conversation_id: conversationId
		})

	test.is(remoteConversationAfter.status, 'unassigned')
})

avaTest('should be able to reply to a moved inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	const conversationId = _.last(supportThread.data.mirrors[0].split('/'))

	await test.context.front.conversation.update({
		conversation_id: conversationId,
		inbox_id: test.context.inboxes[1]
	})

	await test.context.createMessage(supportThread,
		test.context.getMessageSlug(), 'Message in another inbox')
	const result = await test.context.front.conversation.listMessages({
		conversation_id: conversationId
	})

	// eslint-disable-next-line no-underscore-dangle
	const messages = result._results

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
	const result = await test.context.front.conversation.listMessages({
		conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
	})

	// eslint-disable-next-line no-underscore-dangle
	const messages = result._results

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

	const result = await test.context.front.conversation.listComments({
		conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
	})

	// eslint-disable-next-line no-underscore-dangle
	const comments = result._results

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
	const result = await test.context.front.conversation.listComments({
		conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
	})

	// eslint-disable-next-line no-underscore-dangle
	const comments = result._results

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
	const result = await test.context.front.conversation.listComments({
		conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
	})

	// eslint-disable-next-line no-underscore-dangle
	const comments = result._results

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
	await test.context.front.conversation.update({
		conversation_id: id,
		tags: [],
		assignee_id: null
	})

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		tags: [ 'foo' ]
	})

	const result = await wait(() => {
		return test.context.front.conversation.get({
			conversation_id: id
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
	const result = await test.context.front.conversation.listComments({
		conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
	})

	// eslint-disable-next-line no-underscore-dangle
	const comments = result._results

	test.is(comments.length, 1)
	test.is(comments[0].body, 'First comment')
	test.is(comments[0].author.username.replace(/_/g, '-'),
		test.context.username)
})

avaTest('should be able to close an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'closed'
		}
	})

	const result = await wait(() => {
		return test.context.front.conversation.get({
			conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
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

	await test.context.sdk.card.update(supportThread.id, {
		type: supportThread.type,
		data: {
			status: 'archived'
		}
	})

	const result = await wait(() => {
		return test.context.front.conversation.get({
			conversation_id: _.last(supportThread.data.mirrors[0].split('/'))
		})
	}, (conversation) => {
		return conversation.status === 'archived'
	})

	test.is(result.status, 'archived')
})
