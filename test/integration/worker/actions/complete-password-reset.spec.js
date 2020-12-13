/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const crypto = require('crypto')
const helpers = require('../helpers')
const environment = require('@balena/jellyfish-environment')

const MAIL_OPTIONS = environment.mail.options
const {
	resetPasswordSecretToken
} = environment.actions

ava.before(async (test) => {
	await helpers.worker.before(test)
})

ava.beforeEach(async (test) => {
	const {
		worker,
		session,
		jellyfish,
		context,
		processAction
	} = test.context

	const userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	const userEmail = 'test@test.com'
	const userPassword = 'original-password'
	const username = test.context.generateRandomSlug()

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

	const userInfo = await processAction(session, createUserAction)
	const user = await jellyfish.getCardById(context, session, userInfo.data.id)

	const resetToken = crypto.createHmac('sha256', resetPasswordSecretToken)
		.update(user.data.hash)
		.digest('hex')

	nock(`${MAIL_OPTIONS.baseUrl}/${MAIL_OPTIONS.domain}`)
		.persist()
		.post('/messages')
		.basicAuth({
			user: 'api',
			pass: MAIL_OPTIONS.TOKEN
		})
		.reply(200)

	test.context = {
		...test.context,
		user,
		userEmail,
		userPassword,
		username,
		userCard,
		resetToken
	}
})

ava.after(helpers.worker.after)

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

	const passwordReset = await processAction(session, requestPasswordReset)
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

	const completePasswordResetResult = await processAction(session, completePasswordReset)
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

	const newPasswordLoginResult = await processAction(session, newPasswordLoginRequest)
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

	const error = await test.throwsAsync(processAction(session, completePasswordReset))

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

	await processAction(session, requestPasswordReset)

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

	const updatedCard = await processAction(session, requestUpdateCard)
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

	await test.throwsAsync(processAction(session, completePasswordReset), {
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

	await processAction(session, requestPasswordReset)

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

	const requestDelete =	await processAction(session, requestDeleteCard)
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

	await test.throwsAsync(processAction(session, completePasswordReset), {
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

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const requestDeleteCard = {
		action: 'action-delete-card@1.0.0',
		context,
		card: user.id,
		type: user.type,
		arguments: {}
	}

	const requestDelete =	await processAction(session, requestDeleteCard)
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

	await test.throwsAsync(processAction(session, completePasswordReset), {
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

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
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

	await processAction(session, completePasswordReset)

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
