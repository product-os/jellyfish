/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const _ = require('lodash')
const randomstring = require('randomstring')
const Front = require('front-sdk').Front
const helpers = require('./helpers')
const syncContext = require('../../../lib/action-library/sync-context')
const TOKEN = syncContext.getToken('front')

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

	test.context.inbox = process.env.INTEGRATION_FRONT_TEST_INBOX

	test.context.getWhisperSlug = () => {
		return test.context.generateRandomSlug({
			prefix: 'whisper'
		})
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

	test.context.startSupportThread = async (title, description) => {
		// We need a "custom" channel in order to simulate an inbound
		const channels = await test.context.front.inbox.listChannels({
			inbox_id: test.context.inbox
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
				handle: `jellytest-${randomstring.generate().slice(0, 4)}`
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

		const inbox = await test.context.front.inbox.get({
			inbox_id: test.context.inbox
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
					inbox: inbox.name,
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
		inbox_id: test.context.inbox
	})

	// Find the first available teammate for the tests
	// eslint-disable-next-line no-underscore-dangle
	const teammate = _.find(teammates._results, {
		is_available: true
	})
	if (!teammate) {
		throw new Error(`No available teammate for inbox ${test.context.inbox}`)
	}

	await helpers.mirror.beforeEach(test, teammate.username.replace(/_/g, '-'))
})

ava.afterEach(helpers.mirror.afterEach)

// Skip all tests if there is no Front token
const avaTest = TOKEN ? ava.serial : ava.serial.skip

avaTest('should be able to comment on an inbound message', async (test) => {
	const supportThread = await test.context.startSupportThread(
		`My Issue ${randomstring.generate()}`,
		`Foo Bar ${randomstring.generate()}`)

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
		`My Issue ${randomstring.generate()}`,
		`Foo Bar ${randomstring.generate()}`)

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
		`My Issue ${randomstring.generate()}`,
		`Foo Bar ${randomstring.generate()}`)

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
		return conversation.status === 'deleted'
	})

	test.is(result.status, 'deleted')
})
