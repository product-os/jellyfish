/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const {
	v4: uuid
} = require('uuid')
const Front = require('front-sdk').Front
const helpers = require('./helpers')
const environment = require('@balena/jellyfish-environment')
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
							pattern: '\\.frontapp\\.com'
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

		const supportThread = await test.context.executeThenWait(async () => {
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

		await test.context.waitForThreadSyncWhisper(supportThread.id)

		return supportThread
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

ava.serial.after.always(helpers.mirror.after)
ava.serial.beforeEach(async (test) => {
	test.timeout(1000 * 60 * 5)
	await helpers.mirror.beforeEach(test, test.context.teammate.replace(/_/g, '-'))
})

ava.serial.afterEach.always(helpers.mirror.afterEach)

// Skip all tests if there is no Front token
const avaTest = _.some(_.values(TOKEN), _.isEmpty) || environment.test.integration.skip ? ava.serial.skip : ava.serial

avaTest('should close a thread with a #summary whisper', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${uuid()}`,
		`Foo Bar ${uuid()}`,
		test.context.inboxes[0])

	test.is(supportThread.data.status, 'open')

	// Send a message and then wait for the thread to close
	const thread = await test.context.executeThenWait(async () => {
		return test.context.createComment(supportThread,
			test.context.getWhisperSlug(), '#summary Foo Bar')
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
						const: 'closed'
					}
				}
			}
		}
	})
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

	// Give the sync pipeline time to run
	await Bluebird.delay(3000)

	const remoteConversationBefore = await retryWhile429(() => {
		return test.context.front.conversation.get({
			conversation_id: conversationId
		})
	})

	test.is(remoteConversationBefore.status, 'archived')

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

	const remoteConversationAfter = await retryWhile429(() => {
		return test.context.front.conversation.get({
			conversation_id: conversationId
		})
	})

	test.is(remoteConversationAfter.status, 'unassigned')
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
