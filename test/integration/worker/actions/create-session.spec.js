/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const Bluebird = require('bluebird')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(helpers.worker.after)

ava('should not store the password in the queue when using action-create-session', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			password: plaintextPassword
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)

	await Bluebird.delay(2000)

	const request = await test.context.dequeue()
	test.truthy(request)
	test.not(request.data.arguments.password, plaintextPassword)
})
