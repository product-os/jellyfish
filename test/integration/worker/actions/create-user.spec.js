/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
})

ava.afterEach(helpers.worker.afterEach)

ava('should not store the password in the queue when using action-create-user', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')
	const password = 'foobarbaz'

	const request = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request)
	test.not(createUserRequest.data.arguments.password.string, password)

	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(result.error)
})
