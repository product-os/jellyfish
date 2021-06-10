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
const randomWords = require('random-words')
const helpers = require('./helpers')
const environment = require('@balena/jellyfish-environment').defaultEnvironment
const TOKEN = environment.integration.front

const generateRandomWords = (number) => {
	return randomWords(number).join(' ')
}

// Because Front might take a while to process
// message creation requests.
// See: https://dev.frontapp.com/#receive-custom-message
const retryWhile404 = async (fn, times = 5) => {
	try {
		return await fn()
	} catch (error) {
		if (error.status === 404 && times > 0) {
			console.log('Front-mirror test received 404 status: waiting 500ms')
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
			console.log(`Front-mirror test received 429 status: waiting ${delay}ms`)
			await Bluebird.delay(delay)
			return retryWhile429(fn, times - 1)
		}

		throw error
	}
}

const getMirrorWaitSchema = (slug) => {
	return {
		type: 'object',
		required: [ 'slug', 'data' ],
		properties: {
			slug: {
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

	// We need a "custom" channel in order to simulate an inbound message/conversation
	const channels = await retryWhile429(() => {
		return test.context.front.inbox.listChannels({
			inbox_id: test.context.inboxes[0]
		})
	})

	// eslint-disable-next-line no-underscore-dangle
	const channel = _.find(channels._results, {
		type: 'custom'
	})
	if (!channel) {
		throw new Error('No custom channel to simulate inbound')
	}

	const remoteInbox = await retryWhile429(() => {
		return test.context.front.inbox.get({
			inbox_id: test.context.inboxes[0]
		})
	})

	// The Front integration won't create new Front conversation when mirroring, so
	// we need to start by creating a conversation in Front and then manually adding
	// the "mirror" field to a support thread in Jellyfish. This roughly emulates
	// what happens when Jellyfish receives a webhook from Front. In the future
	// we should find a better way to test this completely e2e
	test.context.startSupportThread = async () => {
		const title = `My Issue ${uuid()}`
		const description = `Foo Bar ${uuid()}`

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

		// Add a small delay for the message to become available from the Front API
		// This means we spend less time loop in `retryWhile404` and reduces API requests
		await Bluebird.delay(1000)

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

		const result = await test.context.sdk.card.create({
			name: title,
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

		const supportThread = await test.context.sdk.card.get(result.id)

		return supportThread
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

avaTest('should mirror support thread status', async (test) => {
	const supportThread = await test.context.startSupportThread()

	test.is(supportThread.data.status, 'open')

	await test.context.sdk.card.update(supportThread.id, supportThread.type, [ {
		op: 'replace',
		path: '/data/status',
		value: 'closed'
	} ])

	const id = _.last(supportThread.data.mirrors[0].split('/'))

	await test.context.retry(() => {
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

avaTest('should mirror whisper insert and update on support threads', async (test) => {
	const supportThread = await test.context.startSupportThread()

	const body = generateRandomWords(5)

	const result = await test.context.sdk.event.create({
		target: supportThread,
		type: 'whisper',
		payload: {
			message: body
		}
	})

	// Wait for the whisper to be mirrored
	const whisper = await test.context.waitForMatch(getMirrorWaitSchema(result.slug))

	// Give a small delay for the comment to become available on Front's API
	await Bluebird.delay(1000)

	// Retrieve the comment from Front's API using the mirror ID
	const comment = await retryWhile404(async () => {
		return retryWhile429(() => {
			return test.context.front.comment.get({
				comment_id: whisper.data.mirrors[0].split('/').pop()
			})
		})
	})

	// Double check that it's the same comment body
	test.is(comment.body, body)

	const newBody = generateRandomWords(5)

	await test.context.sdk.card.update(whisper.id, whisper.type, [ {
		op: 'replace',
		path: '/data/payload/message',
		value: newBody
	} ])

	// Give a small delay for the comment to become available on Front's API
	await Bluebird.delay(1000)

	// Poll for the update to the comment from Front's API using the mirror ID
	await test.context.retry(() => {
		return retryWhile404(async () => {
			return retryWhile429(() => {
				return test.context.front.comment.get({
					comment_id: whisper.data.mirrors[0].split('/').pop()
				})
			})
		})
	}, (frontComment) => {
		return _.isEqual(frontComment.body, newBody)
	})

	// If the retry block passed, then the update was mirrored!
	test.pass()
})

avaTest('should mirror message insert and update on support threads', async (test) => {
	const supportThread = await test.context.startSupportThread()

	const body = generateRandomWords(5)

	const result = await test.context.sdk.event.create({
		target: supportThread,
		type: 'message',
		payload: {
			message: body
		}
	})

	// Wait for the message to be mirrored
	const message = await test.context.waitForMatch(getMirrorWaitSchema(result.slug))

	// Give a small delay for the message to become available on Front's API
	await Bluebird.delay(1000)

	// Retrieve the message from Front's API using the mirror ID
	const frontMessage = await retryWhile404(async () => {
		return retryWhile429(() => {
			return test.context.front.message.get({
				message_id: message.data.mirrors[0].split('/').pop()
			})
		})
	})

	// Double check that it's the same message body
	test.is(frontMessage.text, body)

	const newBody = generateRandomWords(5)

	await test.context.sdk.card.update(message.id, message.type, [ {
		op: 'replace',
		path: '/data/payload/message',
		value: newBody
	} ])

	// Give a small delay for the comment to become available on Front's API
	await Bluebird.delay(1000)

	// Poll for the update to the comment from Front's API using the mirror ID
	await test.context.retry(() => {
		return retryWhile404(async () => {
			return retryWhile429(() => {
				return test.context.front.message.get({
					message_id: message.data.mirrors[0].split('/').pop()
				})
			})
		})
	}, (comment) => {
		return _.isEqual(comment.body, newBody)
	})

	// If the retry block passed, then the update was mirrored!
	test.pass()
})

avaTest('should be able to tag an unassigned conversation', async (test) => {
	const supportThread = await test.context.startSupportThread()

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

	const result = await test.context.retry(() => {
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
