/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const randomWords = require('random-words')
const helpers = require('../sdk/helpers')

ava.serial.before(helpers.before)
ava.serial.after.always(helpers.after)

ava.serial.beforeEach(helpers.beforeEach)
ava.serial.afterEach.always(helpers.afterEach)

const generateRandomWords = (number) => {
	return randomWords(number).join(' ')
}

// TODO: These cases test the behaviour of a number triggered actions that are part of the
// default plugin, and should be tested alongside the plugin instead of here
ava('should close a thread with a #summary whisper', async (test) => {
	const {
		sdk
	} = test.context
	const thread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'open'
		}
	})

	await sdk.event.create({
		target: thread,
		type: 'whisper',
		payload: {
			message: `#summary ${generateRandomWords(5)}`
		}
	})

	await test.context.waitForMatch({
		type: 'object',
		required: [ 'id', 'data' ],
		properties: {
			id: {
				const: thread.id
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

	// If a match was found the thread was closed successfully
	test.pass()
})

ava('should re-open a closed support thread if an attached issue is closed', async (test) => {
	const {
		sdk
	} = test.context
	const issue = await sdk.card.create({
		name: 'My issue',
		type: 'issue',
		data: {
			repository: 'product-os/jellyfish-test-github',
			description: 'Foo bar',
			status: 'open'
		}
	})

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'closed'
		}
	})

	await sdk.card.link(supportThread, issue, 'support thread is attached to issue')

	// Close the issue, and then wait for the support thread to be re-opened
	await sdk.card.update(issue.id, issue.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const newSupportThread = await test.context.waitForMatch({
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
})

ava('should re-open a closed support thread if an attached pull request is closed', async (test) => {
	const {
		sdk
	} = test.context
	const pullRequest = await sdk.card.create({
		name: 'My PR',
		type: 'pull-request',
		version: '1.0.0',
		data: {
			status: 'open'
		}
	})

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'closed'
		}
	})

	await sdk.card.link(supportThread, pullRequest, 'support thread is attached to pull request')

	// Close the PR, and then wait for the support thread to be re-opened
	await sdk.card.update(pullRequest.id, pullRequest.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	const newSupportThread = await test.context.waitForMatch({
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
})

ava('should re-open a closed support thread if an attached pattern is closed', async (test) => {
	const {
		sdk
	} = test.context
	const pattern = await sdk.card.create({
		name: 'My pattern',
		type: 'pattern',
		version: '1.0.0',
		data: {
			status: 'open'
		}
	})

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'closed'
		}
	})

	await sdk.card.link(supportThread, pattern, 'has attached')

	// Close the PR, and then wait for the support thread to be re-opened
	await sdk.card.update(pattern.id, pattern.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed-resolved'
		}
	])

	const newSupportThread = await test.context.waitForMatch({
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
})

ava('should re-open a closed support thread if a new message is added', async (test) => {
	const {
		sdk
	} = test.context

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'closed'
		}
	})

	// Add a new message to the thread, and then wait for the support thread to be re-opened
	await sdk.event.create({
		target: supportThread,
		type: 'message',
		payload: {
			message: generateRandomWords(5)
		}
	})

	const newSupportThread = await test.context.waitForMatch({
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
})

ava('should not re-open a closed thread by marking a message as read', async (test) => {
	const {
		sdk
	} = test.context

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'open'
		}
	})

	// Add a new message to the thread
	const message = await sdk.event.create({
		target: supportThread,
		type: 'message',
		payload: {
			message: generateRandomWords(5)
		}
	})

	// Close the thread
	await test.context.sdk.card.update(supportThread.id, supportThread.type, [
		{
			op: 'replace',
			path: '/data/status',
			value: 'closed'
		}
	])

	// Mark the message as read
	await test.context.sdk.card.update(message.id, message.type, [
		{
			op: 'add',
			path: '/data/readBy',
			value: [ 'johndoe' ]
		}
	])

	// Wait a while to verify no triggered actions run
	await Bluebird.delay(5000)

	// Check that the thread is still closed
	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

ava('should not re-open a closed thread with a whisper', async (test) => {
	const {
		sdk
	} = test.context

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'closed'
		}
	})

	await sdk.event.create({
		target: supportThread,
		type: 'whisper',
		payload: {
			message: generateRandomWords(5)
		}
	})

	// Wait a while to verify no triggered actions run
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'closed')
})

ava('should re-open an archived thread with a message', async (test) => {
	const {
		sdk
	} = test.context

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'archived'
		}
	})

	await sdk.event.create({
		target: supportThread,
		type: 'message',
		payload: {
			message: generateRandomWords(5)
		}
	})

	const thread = await test.context.waitForMatch({
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
	test.true(thread.active)
	test.is(thread.data.status, 'open')
})

ava('should not re-open an archived thread with a whisper', async (test) => {
	const {
		sdk
	} = test.context

	const supportThread = await sdk.card.create({
		type: 'support-thread',
		data: {
			status: 'archived'
		}
	})

	await sdk.event.create({
		target: supportThread,
		type: 'whisper',
		payload: {
			message: generateRandomWords(5)
		}
	})

	// Wait a while to verify no triggered actions run
	await Bluebird.delay(5000)

	const thread = await test.context.sdk.getById(supportThread.id)
	test.true(thread.active)
	test.is(thread.data.status, 'archived')
})
