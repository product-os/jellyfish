/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const crypto = require('crypto')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')
const environment = require('../../../../lib/environment')

const MAILGUN = environment.mail
const {
	resetPasswordSecretToken
} = environment.actions

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)

	const {
		queue,
		worker,
		session,
		flush,
		jellyfish,
		context
	} = test.context

	const processAction = async (action) => {
		const createRequest = await queue.producer.enqueue(worker.getId(), session, action)

		await flush(session)
		return queue.producer.waitResults(context, createRequest)
	}

	const userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	const userEmail = 'test@test.com'
	const userPassword = 'original-password'
	const username = 'johndoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: userEmail,
			password: userPassword,
			username: `user-${username}`
		}
	})

	const userInfo = await processAction(createUserAction)
	const user = await jellyfish.getCardById(context, session, userInfo.data.id)

	const resetToken = crypto.createHmac('sha256', resetPasswordSecretToken)
		.update(user.data.hash)
		.digest('hex')

	nock(`${MAILGUN.baseUrl}/${MAILGUN.domain}`)
		.persist()
		.post('/messages')
		.basicAuth({
			user: 'api',
			pass: MAILGUN.TOKEN
		})
		.reply(200)

	test.context = {
		...test.context,
		user,
		processAction,
		userEmail,
		userPassword,
		username,
		userCard,
		resetToken
	}
})

ava.afterEach(helpers.worker.afterEach)

ava('should replace the user password when the requestToken is valid', async (test) => {
	const {
		session,
		context,
		worker,
		processAction,
		user,
		username,
		resetToken,
		userPassword: originalPassword
	} = test.context

	const newPassword = 'new-password'

	const requestPasswordReset = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			username
		}
	}

	const passwordReset = await processAction(requestPasswordReset)
	test.false(passwordReset.error)

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken,
			newPassword
		}
	})

	const completePasswordResetResult = await processAction(completePasswordReset)
	test.false(completePasswordResetResult.error)

	await test.throwsAsync(worker.pre(session, {
		action: 'action-create-session@1.0.0',
		card: user.id,
		type: user.type,
		context,
		arguments: {
			password: originalPassword
		}
	}), {
		instanceOf: worker.errors.WorkerAuthenticationError
	})

	const newPasswordLoginRequest = await test.context.worker.pre(test.context.session, {
		action: 'action-create-session@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			password: newPassword
		}
	})

	const newPasswordLoginResult = await processAction(newPasswordLoginRequest)
	test.false(newPasswordLoginResult.error)
})

ava('should fail when the reset token does not match a valid card', async (test) => {
	const {
		session,
		context,
		worker,
		processAction,
		user
	} = test.context

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken: 'fake-reset-token',
			newPassword: 'new-password'
		}
	})

	const error = await test.throwsAsync(processAction(completePasswordReset))

	test.is(error.name, 'WorkerSchemaMismatch')
	test.is(error.message, `Arguments do not match for action action-complete-password-reset: {
  "resetToken": "fake-reset-token",
  "newPassword": "${completePasswordReset.arguments.newPassword}"
}`)
})

ava('should fail when the reset token has expired', async (test) => {
	const {
		jellyfish,
		session,
		context,
		worker,
		processAction,
		user,
		username,
		resetToken
	} = test.context

	const newPassword = 'new-password'

	const requestPasswordReset = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			username
		}
	}

	await processAction(requestPasswordReset)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'id', 'type' ],
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			data: {
				type: 'object',
				additionalProperties: true,
				properties: {
					resetToken: {
						type: 'string',
						const: resetToken
					}
				}
			}
		}
	})

	const now = new Date()
	const hourInPast = now.setHours(now.getHours() - 1)
	const newExpiry = new Date(hourInPast)

	const requestUpdateCard = {
		action: 'action-update-card@1.0.0',
		context,
		card: passwordReset.id,
		type: passwordReset.type,
		arguments: {
			reason: 'Expiring token for test',
			patch: [
				{
					op: 'replace',
					path: '/data/expiresAt',
					value: newExpiry.toISOString()
				}
			]
		}
	}

	const updatedCard = await processAction(requestUpdateCard)
	test.false(updatedCard.error)

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken,
			newPassword
		}
	})

	await test.throwsAsync(processAction(completePasswordReset), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'Password reset token has expired'
	})
})

ava('should fail when the reset token is not active', async (test) => {
	const {
		jellyfish,
		session,
		context,
		worker,
		processAction,
		user,
		username,
		resetToken
	} = test.context

	const newPassword = 'new-password'

	const requestPasswordReset = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			username
		}
	}

	await processAction(requestPasswordReset)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'id', 'type' ],
		additionalProperties: true,
		properties: {
			id: {
				type: 'string'
			},
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			data: {
				type: 'object',
				additionalProperties: true,
				properties: {
					resetToken: {
						type: 'string',
						const: resetToken
					}
				}
			}
		}
	})

	const requestDeleteCard = {
		action: 'action-delete-card@1.0.0',
		context,
		card: passwordReset.id,
		type: passwordReset.type,
		arguments: {}
	}

	const requestDelete =	await processAction(requestDeleteCard)
	test.false(requestDelete.error)

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken,
			newPassword
		}
	})

	await test.throwsAsync(processAction(completePasswordReset), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'Reset token invalid'
	})
})

ava('should fail if the user becomes inactive between requesting and completing the password reset', async (test) => {
	const {
		session,
		context,
		processAction,
		user,
		username,
		worker,
		resetToken
	} = test.context

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const requestDeleteCard = {
		action: 'action-delete-card@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {}
	}

	const requestDelete =	await processAction(requestDeleteCard)
	test.false(requestDelete.error)

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken,
			newPassword: 'new-password'
		}
	})

	await test.throwsAsync(processAction(completePasswordReset), {
		instanceOf: worker.errors.WorkerAuthenticationError,
		message: 'Reset token invalid'
	})
})

ava('should remove the password reset card', async (test) => {
	const {
		session,
		context,
		processAction,
		user,
		username,
		worker,
		jellyfish,
		resetToken
	} = test.context

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const completePasswordReset = await worker.pre(session, {
		action: 'action-complete-password-reset@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {
			resetToken,
			newPassword: 'new-password'
		}
	})

	await processAction(completePasswordReset)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type', 'active', 'data' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			active: {
				type: 'boolean'
			},
			data: {
				type: 'object',
				properties: {
					resetToken: {
						type: 'string',
						const: resetToken
					}
				},
				required: [ 'resetToken' ]
			}
		}
	}, {
		limit: 1
	})

	// Sanity check to make sure the return element is the one we expect
	test.is(passwordReset.data.resetToken, resetToken)
	test.false(passwordReset.active)
})
