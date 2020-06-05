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

ava('should not store the passwords in the queue when using action-set-password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: test.context.generateRandomSlug({
				prefix: 'user'
			}),
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
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: result.data.id,
		type: result.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)

	const request = await test.context.dequeue()

	test.truthy(request)
	test.truthy(request.data.arguments.currentPassword)
	test.truthy(request.data.arguments.newPassword)
	test.not(request.data.arguments.currentPassword, plaintextPassword)
	test.not(request.data.arguments.newPassword, 'new-password')
})

ava('should change the password of a password-less user given no password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	const resetRequestPre = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	})

	const resetRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, resetRequestPre)
	await test.context.flush(test.context.session)
	const resetResult = await test.context.queue.producer.waitResults(
		test.context.context, resetRequest)
	test.false(resetResult.error)

	const loginRequestPre = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: userCard.id,
		context: test.context.context,
		type: userCard.type,
		arguments: {
			password: 'new-password'
		}
	})

	const loginRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, loginRequestPre)
	await test.context.flush(test.context.session)
	const loginResult = await test.context.queue.producer.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)

	const user = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, userCard.id)
	test.not(user.data.hash, 'new-password')
})

ava('should change a user password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)
	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: plaintextPassword
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})

	const request3 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		card: signupResult.data.id,
		context: test.context.context,
		type: signupResult.data.type,
		arguments: {
			password: 'new-password'
		}
	})

	const loginRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request3)
	await test.context.flush(test.context.session)
	const loginResult = await test.context.queue.producer.waitResults(
		test.context.context, loginRequest)
	test.false(loginResult.error)
})

ava('should not change a user password given invalid current password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: 'xxxxxxxxxxxxxxxxxxxxxx',
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should not change a user password given a null current password', async (test) => {
	const userCard = await test.context.jellyfish.getCardBySlug(
		test.context.context, test.context.session, 'user@latest')

	const request1 = await test.context.worker.pre(test.context.session, {
		action: 'action-create-user@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'johndoe@example.com',
			username: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			password: 'foobarbaz'
		}
	})

	const createUserRequest = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request1)

	await test.context.flush(test.context.session)
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})

ava('should change the hash when updating a user password', async (test) => {
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
	const signupResult = await test.context.queue.producer.waitResults(
		test.context.context, createUserRequest)
	test.false(signupResult.error)

	const userBefore = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, signupResult.data.id)

	const plaintextPassword = 'foobarbaz'

	const request2 = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: signupResult.data.id,
		type: signupResult.data.type,
		arguments: {
			currentPassword: plaintextPassword,
			newPassword: 'new-password'
		}
	})

	const request = await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, request2)
	await test.context.flush(test.context.session)
	const result = await test.context.queue.producer.waitResults(
		test.context.context, request)
	test.false(result.error)

	const userAfter = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, signupResult.data.id)

	test.truthy(userBefore.data.hash)
	test.truthy(userAfter.data.hash)
	test.not(userBefore.data.hash, userAfter.data.hash)
})

ava('should not store the passwords when using action-set-password on a first time password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	const resetRequest = await test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: null,
			newPassword: 'new-password'
		}
	})

	await test.context.queue.producer.enqueue(
		test.context.worker.getId(), test.context.session, resetRequest)

	const request = await test.context.dequeue()

	test.truthy(request)
	test.falsy(request.data.arguments.currentPassword)
	test.truthy(request.data.arguments.newPassword)
	test.not(request.data.arguments.newPassword, 'new-password')
})

ava('should not change the password of a password-less user given a password', async (test) => {
	const userCard = await test.context.jellyfish.insertCard(
		test.context.context, test.context.session, {
			slug: test.context.generateRandomSlug({
				prefix: 'user'
			}),
			type: 'user@1.0.0',
			data: {
				email: 'johndoe@example.com',
				hash: 'PASSWORDLESS',
				roles: [ 'user-community' ]
			}
		})

	await test.throwsAsync(test.context.worker.pre(test.context.session, {
		action: 'action-set-password@1.0.0',
		context: test.context.context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			currentPassword: 'xxxxxxxxxxxxxxxxxxxxxx',
			newPassword: 'new-password'
		}
	}), {
		instanceOf: test.context.worker.errors.WorkerAuthenticationError
	})
})
