/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')

ava.before(async (test) => {
	await helpers.worker.before(test, actionLibrary)
})

ava.after(helpers.worker.after)

ava('should not store the password in the queue when using action-create-user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		worker,
		queue,
		flush
	} = test.context
	const userCard = await jellyfish.getCardBySlug(
		context, session, 'user@latest')
	const password = 'foobarbaz'

	const request = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password
		}
	})

	const createUserRequest = await queue.producer.enqueue(
		worker.getId(), session, request)
	test.not(createUserRequest.data.arguments.password.string, password)

	await flush(session)
	const result = await queue.producer.waitResults(
		context, createUserRequest)
	test.false(result.error)
})

ava('should use the PASSWORDLESS_USER_HASH when the supplied password is an empty string', async (test) => {
	const {
		jellyfish,
		context,
		session,
		worker,
		queue
	} = test.context
	const userCard = await jellyfish.getCardBySlug(
		context, session, 'user@latest')

	const request = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: 'user-johndoe',
			password: ''
		}
	})
	const createUserRequest = await queue.producer.enqueue(
		worker.getId(), session, request)
	test.is(createUserRequest.data.arguments.password, 'PASSWORDLESS')
})
