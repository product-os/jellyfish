/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const nock = require('nock')
const helpers = require('../helpers')
const actionLibrary = require('../../../../lib/action-library')
const environment = require('../../../../lib/environment')

const MAILGUN = environment.mail

const checkForKeyValue = (key, value, text) => {
	const pattern = new RegExp(`name="${key}"\\s*${value}`, 'm')
	const regex = text.search(pattern)
	return regex !== -1
}

ava.beforeEach(async (test) => {
	await helpers.worker.beforeEach(test, actionLibrary)
	const {
		worker,
		session,
		context,
		jellyfish,
		processAction
	} = test.context

	const userCard = await jellyfish.getCardBySlug(context, session, 'user@latest')

	const username = 'johndoe'
	const userEmail = 'test@test.com'
	const userPassword = 'foobarbaz'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			username: `user-${username}`,
			password: userPassword,
			email: userEmail
		}
	})

	const nockRequest = (fn) => {
		nock(`${MAILGUN.baseUrl}/${MAILGUN.domain}`)
			.persist()
			.post('/messages')
			.basicAuth({
				user: 'api',
				pass: MAILGUN.TOKEN
			})
			.reply(200, (uri, requestBody) => {
				fn ? fn(requestBody) : null
			})
	}

	test.context = {
		...test.context,
		user: await processAction(session, createUserAction),
		username,
		userEmail,
		userPassword,
		userCard,
		nockRequest
	}
})

ava.afterEach(async (test) => {
	nock.cleanAll()
	await helpers.worker.afterEach(test)
})

ava('should create a password reset card and user link when arguments match a valid user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		nockRequest
	} = test.context

	nockRequest()

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		},
		$$links: {
			'is attached to': {
				type: 'object',
				properties: {
					id: {
						type: 'string',
						const: user.data.id
					}
				}
			}
		}
	}, {
		limit: 1
	})

	test.true(passwordReset !== undefined)
	test.true(new Date(passwordReset.data.expiresAt) > new Date())
	test.is(passwordReset.links['is attached to'].id, user.id)
})

ava('should send a password-reset email when the username in the argument matches a valid user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		userEmail,
		nockRequest
	} = test.context

	let mailBody
	const saveBody = (body) => {
		mailBody = body
	}

	nockRequest(saveBody)

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type', 'data' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			data: {
				type: 'object',
				properties: {
					resetToken: {
						type: 'string'
					}
				}
			}
		}
	}, {
		limit: 1
	})

	const resetPasswordUrl = `https://jel.ly.fish/password_reset/${passwordReset.data.resetToken}/${username}`

	const expectedEmailBody = `<p>Hello,</p><p>We have received a password reset request for the Jellyfish account attached to this email.</p><p>Please use the link below to reset your password:</p><a href="${resetPasswordUrl}">${resetPasswordUrl}</a><p>Cheers</p><p>Jellyfish Team</p><a href="https://jel.ly.fish">https://jel.ly.fish</a>`

	const fromIsInBody = checkForKeyValue('from', 'no-reply@mail.ly.fish', mailBody)
	const toIsInBody = checkForKeyValue('to', userEmail, mailBody)
	const subjectIsInBody = checkForKeyValue('subject', 'Jellyfish Password Reset', mailBody)
	const htmlIsInBody = checkForKeyValue('html', expectedEmailBody, mailBody)

	test.true(toIsInBody)
	test.true(fromIsInBody)
	test.true(subjectIsInBody)
	test.true(htmlIsInBody)
})

ava('should fail silently if the username does not match a user', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		nockRequest
	} = test.context

	nockRequest()

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username: 'madeup'
		}
	}

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		}
	}, {
		limit: 1
	})

	test.true(passwordReset === undefined)
})

ava('should fail silently if the user is inactive', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		nockRequest
	} = test.context

	nockRequest()

	const requestDeleteCard = {
		action: 'action-delete-card@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {}
	}

	const requestDelete =	await processAction(session, requestDeleteCard)
	test.false(requestDelete.error)

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		}
	}, {
		limit: 1
	})

	test.true(passwordReset === undefined)
})

ava('should fail silently if the user does not have a hash', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		nockRequest
	} = test.context

	nockRequest()

	const requestUpdateCard = {
		action: 'action-update-card@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			reason: 'Removing hash for test',
			patch: [ {
				op: 'replace',
				path: '/data/hash',
				value: 'PASSWORDLESS'
			} ]
		}
	}

	const requestUpdate = await processAction(session, requestUpdateCard)
	test.false(requestUpdate.error)

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const requestPasswordReset = await processAction(session, requestPasswordResetAction)
	test.false(requestPasswordReset.error)

	const [ passwordReset ] = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: false,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		}
	}, {
		limit: 1
	})

	test.true(passwordReset === undefined)
})

ava('should invalidate previous password reset requests', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		nockRequest
	} = test.context

	nockRequest()

	const requestPasswordResetAction = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const firstPasswordResetRequest = await processAction(session, requestPasswordResetAction)
	test.false(firstPasswordResetRequest.error)

	const secondPasswordResetRequest = await processAction(session, requestPasswordResetAction)
	test.false(secondPasswordResetRequest.error)

	const passwordResets = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		}
	}, {
		sortBy: 'created_at'
	})

	test.is(passwordResets.length, 2)
	test.is(passwordResets[0].active, false)
	test.is(passwordResets[1].active, true)
})

ava('should not invalidate previous password reset requests from other users', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		userCard,
		worker,
		nockRequest
	} = test.context

	nockRequest()

	const otherUsername = 'janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'other@user.com',
			username: `user-${otherUsername}`,
			password: 'apassword'
		}
	})

	const otherUser = await processAction(session, createUserAction)
	test.false(otherUser.error)

	const otherUserRequest = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username: otherUsername
		}
	}

	await processAction(session, otherUserRequest)

	const userRequest = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}
	await processAction(session, userRequest)

	const passwordResets = await jellyfish.query(context, session, {
		type: 'object',
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			},
			active: {
				type: 'boolean'
			}
		}
	}, {
		sortBy: 'created_at'
	})

	test.is(passwordResets.length, 2)
	test.true(passwordResets[0].active)
})

ava('accounts with the same password have different request tokens', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		user,
		username,
		userPassword,
		userCard,
		worker,
		nockRequest
	} = test.context

	nockRequest

	const newUsername = 'janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: 'madeup@gmail.com',
			username: `user-${newUsername}`,
			password: userPassword
		}
	})

	const secondUser = await processAction(session, createUserAction)
	test.false(secondUser.error)

	const firstRequest = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username
		}
	}

	const firstPasswordResetRequest = await processAction(session, firstRequest)
	test.false(firstPasswordResetRequest.error)

	const secondRequest = {
		action: 'action-request-password-reset@1.0.0',
		context: test.context.context,
		card: user.data.id,
		type: user.data.type,
		arguments: {
			username: newUsername
		}
	}

	const secondPasswordResetRequest = await processAction(session, secondRequest)
	test.false(secondPasswordResetRequest.error)

	const passwordResets = await jellyfish.query(context, session, {
		type: 'object',
		required: [ 'type' ],
		additionalProperties: true,
		properties: {
			type: {
				type: 'string',
				const: 'password-reset@1.0.0'
			}
		}
	}, {
		sortBy: 'created_at'
	})
	test.is(passwordResets.length, 2)
	test.false(passwordResets[0].data.resetToken === passwordResets[1].data.resetToken)
})

ava('successfully sends an email to a user with an array of emails', async (test) => {
	const {
		jellyfish,
		session,
		context,
		processAction,
		userCard,
		worker,
		nockRequest
	} = test.context

	let mailBody
	const saveBody = (body) => {
		mailBody = body
	}
	nockRequest(saveBody)

	const firstEmail = 'first@email.com'
	const secondEmail = 'second@email.com'
	const newUsername = 'janedoe'

	const createUserAction = await worker.pre(session, {
		action: 'action-create-user@1.0.0',
		context,
		card: userCard.id,
		type: userCard.type,
		arguments: {
			email: firstEmail,
			username: `user-${newUsername}`,
			password: 'foobarbaz'
		}
	})

	const newUser = await processAction(session, createUserAction)
	test.false(newUser.error)

	const requestUpdateCard = {
		action: 'action-update-card@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {
			reason: 'Making email an array for test',
			patch: [ {
				op: 'replace',
				path: '/data/email',
				value: [ firstEmail, secondEmail ]
			} ]
		}
	}

	const requestUpdate = await processAction(session, requestUpdateCard)
	test.false(requestUpdate.error)

	const userWithEmailArray = await jellyfish.getCardById(context, session, newUser.data.id)

	test.deepEqual(userWithEmailArray.data.email, [ firstEmail, secondEmail ])

	const passwordResetRequest = {
		action: 'action-request-password-reset@1.0.0',
		context,
		card: newUser.data.id,
		type: newUser.data.type,
		arguments: {
			username: newUsername
		}
	}

	const passwordReset = await processAction(session, passwordResetRequest)
	test.false(passwordReset.error)

	const toIsInBody = checkForKeyValue('to', firstEmail, mailBody)
	test.true(toIsInBody)
})
